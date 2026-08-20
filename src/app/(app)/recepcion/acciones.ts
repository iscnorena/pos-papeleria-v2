'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { RECEPCION } from '@/config/pos';
import { db } from '@/db';
import {
  goodsReceiptItems,
  goodsReceipts,
  inventories,
  productSuppliers,
  products,
  suppliers,
} from '@/db/schema';
import { parsearCfdi } from '@/lib/cfdi';
import { calcularCostoConsolidado } from '@/lib/costeo';
import { momento } from '@/lib/formato';
import { asegurarInventario } from '@/lib/inventario';
import { aCentavos, aCentesimas, aPesos } from '@/lib/money';
import type { EstadoFormulario, Resultado } from '@/lib/resultado';
import { exigirRol, requerirSesion } from '@/lib/sesion';

// Recepción de Mercancía (docs/modulo-recepcion-mercancia-xml.md). Dos vías —importar un
// CFDI XML o capturar líneas a mano— alimentan el mismo modelo de cabecera + líneas.
// Cualquier sesión puede crear/editar una pre-carga en borrador; solo `admin` autoriza,
// que es el único paso que toca inventario (§Decisiones ya cerradas con el usuario).

const dinero = (etiqueta: string) =>
  z
    .string()
    .trim()
    .transform((texto, ctx) => {
      const centavos = aCentavos(texto);
      if (centavos === null) {
        ctx.addIssue({ code: 'custom', message: `${etiqueta} no es una cantidad válida.` });
        return z.NEVER;
      }
      if (centavos < 0) {
        ctx.addIssue({ code: 'custom', message: `${etiqueta} no puede ser negativo.` });
        return z.NEVER;
      }
      return centavos;
    });

const cantidadCampo = z
  .string()
  .trim()
  .transform((texto, ctx) => {
    const centesimas = aCentesimas(texto);
    if (centesimas === null || centesimas <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Cantidad no válida.' });
      return z.NEVER;
    }
    return centesimas;
  });

/** Recalcula subtotal/impuesto/total de una recepción MANUAL a partir de sus líneas, para
 *  que la validación de cuadre en `autorizarRecepcion` siempre coincida por construcción.
 *  No aplica a recepciones `source: 'xml'`: ahí el total es el del CFDI, y es justo lo que
 *  la validación de cuadre debe contrastar contra la suma de líneas. */
async function recalcularTotalesSiManual(receiptId: number): Promise<void> {
  const [recepcion] = await db
    .select({ source: goodsReceipts.source })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);
  if (!recepcion || recepcion.source !== 'manual') return;

  const lineas = await db
    .select({ taxAmount: goodsReceiptItems.taxAmount, lineTotal: goodsReceiptItems.lineTotal })
    .from(goodsReceiptItems)
    .where(eq(goodsReceiptItems.receiptId, receiptId));

  const tax = lineas.reduce((acc, l) => acc + (aCentavos(l.taxAmount) ?? 0), 0);
  const total = lineas.reduce((acc, l) => acc + (aCentavos(l.lineTotal) ?? 0), 0);

  await db
    .update(goodsReceipts)
    .set({ subtotal: aPesos(total - tax), tax: aPesos(tax), total: aPesos(total) })
    .where(eq(goodsReceipts.id, receiptId));
}

/** Confirma que una recepción existe y sigue en borrador; si no, el mensaje explica por
 *  qué no se puede editar. Usado por todas las acciones de edición de línea. */
async function recepcionEditable(
  receiptId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [recepcion] = await db
    .select({ status: goodsReceipts.status })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);
  if (!recepcion) return { ok: false, error: 'La recepción no existe.' };
  if (recepcion.status !== 'draft') {
    return { ok: false, error: 'Solo se puede editar una recepción en borrador.' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------------------
// Importar XML / crear manual
// ---------------------------------------------------------------------------------------

/**
 * Importa un CFDI 4.0 y crea la pre-carga (borrador). El XML se procesa en memoria y se
 * descarta: no se guarda el archivo en ningún lado (§Decisiones ya cerradas). Bloquea la
 * creación misma de la pre-carga (no solo la autorización): estructura inválida, RFC sin
 * proveedor configurado, UUID ya importado.
 */
export async function importarXmlCfdi(datos: FormData): Promise<Resultado<{ id: number }>> {
  const sesion = await requerirSesion();

  const archivo = datos.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: 'Selecciona un archivo XML.' };
  }

  const xmlTexto = await archivo.text();
  const parseo = parsearCfdi(xmlTexto);
  if (!parseo.ok) return { ok: false, error: parseo.error };
  const { comprobante } = parseo;

  const [proveedor] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.rfc, comprobante.emisor.rfc), eq(suppliers.isActive, true)))
    .limit(1);
  if (!proveedor) {
    return {
      ok: false,
      error: `El RFC emisor (${comprobante.emisor.rfc}) no corresponde a ningún proveedor configurado.`,
    };
  }

  const [existente] = await db
    .select({
      id: goodsReceipts.id,
      createdAt: goodsReceipts.createdAt,
      cfdiFolio: goodsReceipts.cfdiFolio,
    })
    .from(goodsReceipts)
    .where(and(eq(goodsReceipts.cfdiUuid, comprobante.uuid), ne(goodsReceipts.status, 'discarded')))
    .limit(1);
  if (existente) {
    const fecha = momento(existente.createdAt);
    const folio = existente.cfdiFolio ? ` (folio ${existente.cfdiFolio})` : '';
    return {
      ok: false,
      error: `Esta factura ya fue importada el ${fecha} en la recepción #${existente.id}${folio}.`,
    };
  }

  // Emparejamiento previo (proveedor, NoIdentificacion) contra product_suppliers: si ya se
  // resolvió antes, la línea nace vinculada.
  const codigos = comprobante.conceptos
    .map((c) => c.noIdentificacion)
    .filter((c): c is string => c !== null);
  const emparejados =
    codigos.length > 0
      ? await db
          .select()
          .from(productSuppliers)
          .where(
            and(
              eq(productSuppliers.supplierId, proveedor.id),
              inArray(productSuppliers.supplierCode, codigos),
            ),
          )
      : [];
  const porCodigo = new Map(emparejados.map((e) => [e.supplierCode, e]));

  try {
    const receiptId = await db.transaction(async (tx) => {
      const [recepcion] = await tx
        .insert(goodsReceipts)
        .values({
          source: 'xml',
          status: 'draft',
          supplierId: proveedor.id,
          branchId: sesion.branchId,
          cfdiUuid: comprobante.uuid,
          cfdiSeries: comprobante.serie,
          cfdiFolio: comprobante.folio,
          cfdiIssuedAt: comprobante.fechaEmision,
          cfdiStampedAt: comprobante.fechaTimbrado,
          subtotal: aPesos(comprobante.subtotal),
          tax: aPesos(comprobante.total - comprobante.subtotal),
          total: aPesos(comprobante.total),
          createdByUserId: sesion.userId,
        })
        .returning({ id: goodsReceipts.id });
      if (!recepcion) throw new Error('No se pudo crear la recepción.');

      for (const concepto of comprobante.conceptos) {
        const match = concepto.noIdentificacion
          ? porCodigo.get(concepto.noIdentificacion)
          : undefined;
        await tx.insert(goodsReceiptItems).values({
          receiptId: recepcion.id,
          productId: match?.productId ?? null,
          supplierCode: concepto.noIdentificacion,
          description: concepto.descripcion,
          satProductKey: concepto.claveProdServ,
          unitKey: concepto.claveUnidad,
          unitLabel: concepto.unidad,
          quantity: aPesos(concepto.cantidad),
          unitCost: aPesos(concepto.valorUnitario),
          taxRate: concepto.tasaIva.toFixed(4),
          taxAmount: aPesos(concepto.importeIva),
          lineTotal: aPesos(concepto.importe + concepto.importeIva),
          matchStatus: match ? 'matched_auto' : 'unmatched',
        });
      }

      return recepcion.id;
    });

    revalidatePath('/recepcion');
    return { ok: true, data: { id: receiptId } };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return { ok: false, error: 'Esta factura ya fue importada (UUID duplicado).' };
    }
    return { ok: false, error: 'No se pudo importar el XML. Inténtalo de nuevo.' };
  }
}

/** Crea una recepción en borrador con captura manual, sin líneas todavía. */
export async function crearRecepcionManual(datos: FormData): Promise<Resultado<{ id: number }>> {
  const sesion = await requerirSesion();

  const analisis = z
    .object({
      supplierId: z.coerce.number().int().positive('Elige un proveedor.'),
      referenceNote: z.string().trim().max(200).optional(),
    })
    .safeParse({
      supplierId: datos.get('supplierId'),
      referenceNote: datos.get('referenceNote') || undefined,
    });
  if (!analisis.success) {
    return { ok: false, error: analisis.error.issues[0]?.message ?? 'Datos no válidos.' };
  }
  const { supplierId, referenceNote } = analisis.data;

  const [creada] = await db
    .insert(goodsReceipts)
    .values({
      source: 'manual',
      status: 'draft',
      supplierId,
      branchId: sesion.branchId,
      createdByUserId: sesion.userId,
      referenceNote: referenceNote ?? null,
    })
    .returning({ id: goodsReceipts.id });
  if (!creada) return { ok: false, error: 'No se pudo crear la recepción.' };

  revalidatePath('/recepcion');
  return { ok: true, data: { id: creada.id } };
}

// ---------------------------------------------------------------------------------------
// Edición de líneas (solo mientras la recepción está en borrador)
// ---------------------------------------------------------------------------------------

const esquemaLinea = z.object({
  receiptId: z.number().int().positive(),
  productId: z.number().int().positive().optional(),
  supplierCode: z.string().trim().max(60).optional(),
  description: z.string().trim().min(1, 'Falta la descripción.').max(200),
  quantity: cantidadCampo,
  unitCost: dinero('El costo'),
  taxRate: z.number().min(0).max(1).optional(),
});

/** Agrega una línea a mano (captura manual, o para completar una recepción XML). */
export async function agregarLineaManual(entrada: unknown): Promise<Resultado<{ id: number }>> {
  await requerirSesion();

  const analisis = esquemaLinea.safeParse(entrada);
  if (!analisis.success) {
    return { ok: false, error: analisis.error.issues[0]?.message ?? 'Revisa la línea.' };
  }
  const {
    receiptId,
    productId,
    supplierCode,
    description,
    quantity,
    unitCost,
    taxRate = 0,
  } = analisis.data;

  const editable = await recepcionEditable(receiptId);
  if (!editable.ok) return { ok: false, error: editable.error };

  const [recepcion] = await db
    .select({ supplierId: goodsReceipts.supplierId })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);
  if (!recepcion) return { ok: false, error: 'La recepción no existe.' };

  const importe = Math.round((unitCost * quantity) / 100);
  const taxAmount = Math.round(importe * taxRate);
  const lineTotal = importe + taxAmount;

  const [creada] = await db
    .insert(goodsReceiptItems)
    .values({
      receiptId,
      productId: productId ?? null,
      supplierCode: supplierCode ?? null,
      description,
      quantity: aPesos(quantity),
      unitCost: aPesos(unitCost),
      taxRate: taxRate.toFixed(4),
      taxAmount: aPesos(taxAmount),
      lineTotal: aPesos(lineTotal),
      matchStatus: productId ? 'matched_manual' : 'unmatched',
    })
    .returning({ id: goodsReceiptItems.id });
  if (!creada) return { ok: false, error: 'No se pudo agregar la línea.' };

  if (productId && supplierCode) {
    await db
      .insert(productSuppliers)
      .values({ productId, supplierId: recepcion.supplierId, supplierCode })
      .onConflictDoUpdate({
        target: [productSuppliers.supplierId, productSuppliers.supplierCode],
        set: { productId },
      });
  }

  await recalcularTotalesSiManual(receiptId);
  revalidatePath(`/recepcion/${receiptId}`);
  return { ok: true, data: { id: creada.id } };
}

const esquemaEditarLinea = z.object({
  lineId: z.number().int().positive(),
  productId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1, 'Falta la descripción.').max(200).optional(),
  quantity: cantidadCampo.optional(),
  unitCost: dinero('El costo').optional(),
});

/** Edita cantidad/costo/producto/descripción de una línea existente. */
export async function editarLinea(entrada: unknown): Promise<Resultado<undefined>> {
  await requerirSesion();

  const analisis = esquemaEditarLinea.safeParse(entrada);
  if (!analisis.success) {
    return { ok: false, error: analisis.error.issues[0]?.message ?? 'Revisa la línea.' };
  }
  const { lineId, productId, description, quantity, unitCost } = analisis.data;

  const [fila] = await db
    .select({ item: goodsReceiptItems, status: goodsReceipts.status })
    .from(goodsReceiptItems)
    .innerJoin(goodsReceipts, eq(goodsReceiptItems.receiptId, goodsReceipts.id))
    .where(eq(goodsReceiptItems.id, lineId))
    .limit(1);
  if (!fila) return { ok: false, error: 'La línea no existe.' };
  if (fila.status !== 'draft') {
    return { ok: false, error: 'Solo se puede editar una recepción en borrador.' };
  }

  const nuevaCantidad = quantity ?? aCentesimas(fila.item.quantity) ?? 0;
  const nuevoCosto = unitCost ?? aCentavos(fila.item.unitCost) ?? 0;
  const tasa = Number(fila.item.taxRate);
  const importe = Math.round((nuevoCosto * nuevaCantidad) / 100);
  const taxAmount = Math.round(importe * (Number.isFinite(tasa) ? tasa : 0));
  const lineTotal = importe + taxAmount;

  await db
    .update(goodsReceiptItems)
    .set({
      ...(productId !== undefined
        ? {
            productId,
            matchStatus: productId ? ('matched_manual' as const) : ('unmatched' as const),
          }
        : {}),
      ...(description !== undefined ? { description } : {}),
      quantity: aPesos(nuevaCantidad),
      unitCost: aPesos(nuevoCosto),
      taxAmount: aPesos(taxAmount),
      lineTotal: aPesos(lineTotal),
    })
    .where(eq(goodsReceiptItems.id, lineId));

  await recalcularTotalesSiManual(fila.item.receiptId);
  revalidatePath(`/recepcion/${fila.item.receiptId}`);
  return { ok: true, data: undefined };
}

/** Elimina una línea. */
export async function eliminarLinea(entrada: unknown): Promise<Resultado<undefined>> {
  await requerirSesion();

  const analisis = z.object({ lineId: z.number().int().positive() }).safeParse(entrada);
  if (!analisis.success) return { ok: false, error: 'Línea no válida.' };
  const { lineId } = analisis.data;

  const [fila] = await db
    .select({ receiptId: goodsReceiptItems.receiptId, status: goodsReceipts.status })
    .from(goodsReceiptItems)
    .innerJoin(goodsReceipts, eq(goodsReceiptItems.receiptId, goodsReceipts.id))
    .where(eq(goodsReceiptItems.id, lineId))
    .limit(1);
  if (!fila) return { ok: false, error: 'La línea no existe.' };
  if (fila.status !== 'draft') {
    return { ok: false, error: 'Solo se puede editar una recepción en borrador.' };
  }

  await db.delete(goodsReceiptItems).where(eq(goodsReceiptItems.id, lineId));

  await recalcularTotalesSiManual(fila.receiptId);
  revalidatePath(`/recepcion/${fila.receiptId}`);
  return { ok: true, data: undefined };
}

/** Vincula un producto existente a una línea sin match; guarda el par
 *  (proveedor, supplierCode) → producto para que la próxima factura empareje sola. */
export async function vincularProducto(entrada: unknown): Promise<Resultado<undefined>> {
  await requerirSesion();

  const analisis = z
    .object({ lineId: z.number().int().positive(), productId: z.number().int().positive() })
    .safeParse(entrada);
  if (!analisis.success) return { ok: false, error: 'Datos no válidos.' };
  const { lineId, productId } = analisis.data;

  const [fila] = await db
    .select({
      item: goodsReceiptItems,
      status: goodsReceipts.status,
      supplierId: goodsReceipts.supplierId,
    })
    .from(goodsReceiptItems)
    .innerJoin(goodsReceipts, eq(goodsReceiptItems.receiptId, goodsReceipts.id))
    .where(eq(goodsReceiptItems.id, lineId))
    .limit(1);
  if (!fila) return { ok: false, error: 'La línea no existe.' };
  if (fila.status !== 'draft') {
    return { ok: false, error: 'Solo se puede editar una recepción en borrador.' };
  }

  await db
    .update(goodsReceiptItems)
    .set({ productId, matchStatus: 'matched_manual' })
    .where(eq(goodsReceiptItems.id, lineId));

  if (fila.item.supplierCode) {
    await db
      .insert(productSuppliers)
      .values({ productId, supplierId: fila.supplierId, supplierCode: fila.item.supplierCode })
      .onConflictDoUpdate({
        target: [productSuppliers.supplierId, productSuppliers.supplierCode],
        set: { productId },
      });
  }

  revalidatePath(`/recepcion/${fila.item.receiptId}`);
  return { ok: true, data: undefined };
}

/** Crea un producto nuevo a partir de una línea sin match y la resuelve con él. */
export async function crearProductoDesdeLinea(
  entrada: unknown,
): Promise<Resultado<{ productId: number }>> {
  await requerirSesion();

  const analisis = z
    .object({
      lineId: z.number().int().positive(),
      categoryId: z.number().int().positive().optional(),
      code: z.string().trim().max(60).optional(),
    })
    .safeParse(entrada);
  if (!analisis.success) return { ok: false, error: 'Datos no válidos.' };
  const { lineId, categoryId, code } = analisis.data;

  const [fila] = await db
    .select({
      item: goodsReceiptItems,
      status: goodsReceipts.status,
      supplierId: goodsReceipts.supplierId,
    })
    .from(goodsReceiptItems)
    .innerJoin(goodsReceipts, eq(goodsReceiptItems.receiptId, goodsReceipts.id))
    .where(eq(goodsReceiptItems.id, lineId))
    .limit(1);
  if (!fila) return { ok: false, error: 'La línea no existe.' };
  if (fila.status !== 'draft') {
    return { ok: false, error: 'Solo se puede editar una recepción en borrador.' };
  }

  const [creado] = await db
    .insert(products)
    .values({
      name: fila.item.description,
      code: code ?? null,
      categoryId: categoryId ?? null,
      costPrice: fila.item.unitCost,
      salePrice: '0',
    })
    .returning({ id: products.id });
  if (!creado) return { ok: false, error: 'No se pudo crear el producto.' };

  await asegurarInventario(creado.id);

  await db
    .update(goodsReceiptItems)
    .set({ productId: creado.id, matchStatus: 'created_new' })
    .where(eq(goodsReceiptItems.id, lineId));

  if (fila.item.supplierCode) {
    await db
      .insert(productSuppliers)
      .values({
        productId: creado.id,
        supplierId: fila.supplierId,
        supplierCode: fila.item.supplierCode,
      })
      .onConflictDoUpdate({
        target: [productSuppliers.supplierId, productSuppliers.supplierCode],
        set: { productId: creado.id },
      });
  }

  revalidatePath(`/recepcion/${fila.item.receiptId}`);
  revalidatePath('/productos');
  return { ok: true, data: { productId: creado.id } };
}

export type SugerenciaProducto = {
  id: number;
  name: string;
  code: string | null;
  similitud: number;
};

/** Sugerencias por similitud de texto (pg_trgm) contra la Descripcion del CFDI, para
 *  emparejar una línea sin match en un clic en vez de buscar a ciegas. */
export async function sugerirProductos(
  descripcion: string,
  limite = 5,
): Promise<SugerenciaProducto[]> {
  await requerirSesion();
  const termino = descripcion.trim();
  if (termino === '') return [];

  return db
    .select({
      id: products.id,
      name: products.name,
      code: products.code,
      similitud: sql<number>`similarity(${products.name}, ${termino})`,
    })
    .from(products)
    .where(and(eq(products.isActive, true), sql`${products.name} % ${termino}`))
    .orderBy(sql`similarity(${products.name}, ${termino}) desc`)
    .limit(limite);
}

// ---------------------------------------------------------------------------------------
// Autorizar / descartar
// ---------------------------------------------------------------------------------------

type CodigoErrorAutorizacion = 'sin-lineas' | 'lineas-sin-vincular' | 'descuadre';

class ErrorAutorizacion extends Error {
  codigo: CodigoErrorAutorizacion;
  constructor(codigo: CodigoErrorAutorizacion) {
    super(codigo);
    this.codigo = codigo;
  }
}

const MENSAJES_ERROR_AUTORIZACION: Record<CodigoErrorAutorizacion, string> = {
  'sin-lineas': 'La recepción no tiene líneas.',
  'lineas-sin-vincular': 'Hay líneas sin producto vinculado.',
  descuadre: 'La suma de las líneas no cuadra con el total de la factura.',
};

/**
 * Único momento en que se toca inventario. Admin-only. La condición `status = 'draft'`
 * dentro del propio `UPDATE` es lo que impide que dos administradores autoricen la misma
 * pre-carga a la vez (mismo mecanismo que `cancelarVenta` en `historial/acciones.ts`): solo
 * el primero encuentra fila que reclamar. Si la validación posterior falla, el `throw`
 * revierte también ese `UPDATE` — la recepción vuelve a `draft` tal cual estaba.
 */
export async function autorizarRecepcion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };

  const analisis = z.coerce.number().int().positive().safeParse(datos.get('receiptId'));
  if (!analisis.success) return { error: 'Recepción no válida.' };
  const receiptId = analisis.data;

  let resultado: 'autorizada' | 'ya-resuelta';
  try {
    resultado = await db.transaction(async (tx) => {
      const reclamadas = await tx
        .update(goodsReceipts)
        .set({
          status: 'authorized',
          authorizedByUserId: permiso.sesion.userId,
          authorizedAt: new Date(),
        })
        .where(and(eq(goodsReceipts.id, receiptId), eq(goodsReceipts.status, 'draft')))
        .returning();
      const recepcion = reclamadas[0];
      if (!recepcion) return 'ya-resuelta' as const;

      const lineas = await tx
        .select()
        .from(goodsReceiptItems)
        .where(eq(goodsReceiptItems.receiptId, receiptId));
      if (lineas.length === 0) throw new ErrorAutorizacion('sin-lineas');
      if (lineas.some((l) => l.productId === null))
        throw new ErrorAutorizacion('lineas-sin-vincular');

      const sumaLineas = lineas.reduce((acc, l) => acc + (aCentavos(l.lineTotal) ?? 0), 0);
      const totalComprobante = aCentavos(recepcion.total) ?? 0;
      if (Math.abs(sumaLineas - totalComprobante) > RECEPCION.toleranciaCuadreCentavos) {
        throw new ErrorAutorizacion('descuadre');
      }

      for (const linea of lineas) {
        const productId = linea.productId!;

        // Stock: SUMA (a diferencia de `ajustarExistencia`, que fija lo contado).
        const actualizado = await tx
          .update(inventories)
          .set({ stock: sql`${inventories.stock} + ${linea.quantity}` })
          .where(
            and(eq(inventories.productId, productId), eq(inventories.branchId, recepcion.branchId)),
          )
          .returning({ id: inventories.id });
        if (actualizado.length === 0) {
          await tx
            .insert(inventories)
            .values({ productId, branchId: recepcion.branchId, stock: linea.quantity });
        }

        if (linea.supplierCode) {
          await tx
            .insert(productSuppliers)
            .values({
              productId,
              supplierId: recepcion.supplierId,
              supplierCode: linea.supplierCode,
              lastCost: linea.unitCost,
              lastCostAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [productSuppliers.supplierId, productSuppliers.supplierCode],
              set: { productId, lastCost: linea.unitCost, lastCostAt: new Date() },
            });
        }

        const candidatos = await tx
          .select({
            supplierId: productSuppliers.supplierId,
            isPreferred: productSuppliers.isPreferred,
            lastCost: productSuppliers.lastCost,
            lastCostAt: productSuppliers.lastCostAt,
          })
          .from(productSuppliers)
          .where(eq(productSuppliers.productId, productId));

        const nuevoCosto = calcularCostoConsolidado(
          candidatos.map((c) => ({ ...c, lastCost: aCentavos(c.lastCost) ?? 0 })),
        );
        if (nuevoCosto !== null) {
          await tx
            .update(products)
            .set({ costPrice: aPesos(nuevoCosto) })
            .where(eq(products.id, productId));
        }
      }

      return 'autorizada' as const;
    });
  } catch (err) {
    if (err instanceof ErrorAutorizacion) {
      return { error: MENSAJES_ERROR_AUTORIZACION[err.codigo] };
    }
    return { error: 'No se pudo autorizar la recepción. Inténtalo de nuevo.' };
  }

  if (resultado === 'ya-resuelta')
    return { error: 'Esta recepción ya fue autorizada o descartada.' };

  revalidatePath('/recepcion');
  revalidatePath(`/recepcion/${receiptId}`);
  revalidatePath('/inventario');
  revalidatePath('/productos');
  return { ok: true, mensaje: 'Recepción autorizada. Inventario actualizado.' };
}

/** Descarta una pre-carga: nunca toca inventario. El UUID queda libre automáticamente (el
 *  índice único de `goods_receipts.cfdi_uuid` es parcial, solo cubre estados no
 *  descartados — ver `src/db/schema.ts`), así que la misma factura puede reimportarse. */
export async function descartarRecepcion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();

  const analisis = z.coerce.number().int().positive().safeParse(datos.get('receiptId'));
  if (!analisis.success) return { error: 'Recepción no válida.' };
  const receiptId = analisis.data;
  const discardReason = (datos.get('discardReason') as string | null)?.trim() || null;

  const descartadas = await db
    .update(goodsReceipts)
    .set({
      status: 'discarded',
      discardedByUserId: sesion.userId,
      discardedAt: new Date(),
      discardReason,
    })
    .where(and(eq(goodsReceipts.id, receiptId), eq(goodsReceipts.status, 'draft')))
    .returning({ id: goodsReceipts.id });

  if (descartadas.length === 0) return { error: 'Esta recepción ya fue autorizada o descartada.' };

  revalidatePath('/recepcion');
  revalidatePath(`/recepcion/${receiptId}`);
  return { ok: true, mensaje: 'Recepción descartada.' };
}
