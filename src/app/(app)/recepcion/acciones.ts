'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { RECEPCION } from '@/config/pos';
import { db } from '@/db';
import {
  claudeIntegration,
  goodsReceiptItems,
  goodsReceipts,
  inventories,
  productSuppliers,
  products,
  suppliers,
} from '@/db/schema';
import { parsearCfdi } from '@/lib/cfdi';
import { extraerListadoDeTicket } from '@/lib/claudeVision';
import { calcularCostoConsolidado } from '@/lib/costeo';
import { momento } from '@/lib/formato';
import { obtenerIdioma, t, type ClaveI18n, type Idioma } from '@/lib/i18n/servidor';
import { asegurarInventario } from '@/lib/inventario';
import { aCentavos, aCentesimas, aPesos } from '@/lib/money';
import type { EstadoFormulario, Resultado } from '@/lib/resultado';
import { exigirRol, requerirSesion, type Sesion } from '@/lib/sesion';
import { parsearTicketTexto } from '@/lib/ticketTexto';

// Recepción de Mercancía (docs/modulo-recepcion-mercancia-xml.md). Cuatro vías —importar
// un CFDI XML, capturar líneas a mano, pegar un listado de texto (típicamente generado
// pidiéndole a Claude que lea la foto de un ticket) o subir la foto directo (si la
// integración con la API de Claude está activada)— alimentan el mismo modelo de cabecera +
// líneas. Cualquier sesión puede crear/editar una pre-carga en borrador; solo `admin`
// autoriza, que es el único paso que toca inventario (§Decisiones ya cerradas con el
// usuario).

const dinero = (idioma: Idioma, etiqueta: string) =>
  z
    .string()
    .trim()
    .transform((texto, ctx) => {
      const centavos = aCentavos(texto);
      if (centavos === null) {
        ctx.addIssue({
          code: 'custom',
          message: t(idioma, 'recepcion.errorNoEsCantidadValida', { etiqueta }),
        });
        return z.NEVER;
      }
      if (centavos < 0) {
        ctx.addIssue({
          code: 'custom',
          message: t(idioma, 'recepcion.errorNoPuedeSerNegativo', { etiqueta }),
        });
        return z.NEVER;
      }
      return centavos;
    });

const cantidadCampo = (idioma: Idioma) =>
  z
    .string()
    .trim()
    .transform((texto, ctx) => {
      const centesimas = aCentesimas(texto);
      if (centesimas === null || centesimas <= 0) {
        ctx.addIssue({ code: 'custom', message: t(idioma, 'comun.cantidadNoValida') });
        return z.NEVER;
      }
      return centesimas;
    });

/** Recalcula subtotal/impuesto/total a partir de las líneas, para que la validación de
 *  cuadre en `autorizarRecepcion` siempre coincida por construcción. Aplica a `'manual'`,
 *  `'texto'` y `'foto'` — ninguna trae un total "oficial" propio. No aplica a
 *  `source: 'xml'`: ahí el total es el del CFDI, y es justo lo que la validación de cuadre
 *  debe contrastar contra la suma de líneas. */
async function recalcularTotalesSiManual(receiptId: number): Promise<void> {
  const [recepcion] = await db
    .select({ source: goodsReceipts.source })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);
  if (!recepcion || recepcion.source === 'xml') return;

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
  idioma: Idioma,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [recepcion] = await db
    .select({ status: goodsReceipts.status })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);
  if (!recepcion) return { ok: false, error: t(idioma, 'recepcion.errorLaRecepcionNoExiste') };
  if (recepcion.status !== 'draft') {
    return { ok: false, error: t(idioma, 'recepcion.errorSoloBorrador') };
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
  const idioma = await obtenerIdioma();

  const archivo = datos.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: t(idioma, 'recepcion.errorSeleccionaXml') };
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
      error: t(idioma, 'recepcion.errorRfcNoCorresponde', { rfc: comprobante.emisor.rfc }),
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
    const fecha = momento(existente.createdAt, idioma);
    const folio = existente.cfdiFolio ? ` (folio ${existente.cfdiFolio})` : '';
    return {
      ok: false,
      error: t(idioma, 'recepcion.errorFacturaYaImportada', {
        fecha,
        id: existente.id,
        folio,
      }),
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
      if (!recepcion) throw new Error(t(idioma, 'recepcion.errorNoSePudoCrearRecepcion'));

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
      return { ok: false, error: t(idioma, 'recepcion.errorFacturaYaImportadaUuid') };
    }
    return { ok: false, error: t(idioma, 'recepcion.errorNoSePudoImportarXml') };
  }
}

/** Proveedor + referencia opcional: cabecera común a captura manual, texto pegado y foto —
 *  ninguna de las tres trae estos datos de un documento fiscal, a diferencia de XML. */
const esquemaCabeceraLibre = (idioma: Idioma) =>
  z.object({
    supplierId: z.coerce.number().int().positive(t(idioma, 'recepcion.errorEligeProveedor')),
    referenceNote: z.string().trim().max(200).optional(),
  });

/** Crea una recepción en borrador con captura manual, sin líneas todavía. */
export async function crearRecepcionManual(datos: FormData): Promise<Resultado<{ id: number }>> {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();

  const analisis = esquemaCabeceraLibre(idioma).safeParse({
    supplierId: datos.get('supplierId'),
    referenceNote: datos.get('referenceNote') || undefined,
  });
  if (!analisis.success) {
    return {
      ok: false,
      error: analisis.error.issues[0]?.message ?? t(idioma, 'recepcion.errorDatosNoValidos'),
    };
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
  if (!creada) return { ok: false, error: t(idioma, 'recepcion.errorNoSePudoCrearRecepcion') };

  revalidatePath('/recepcion');
  return { ok: true, data: { id: creada.id } };
}

/** Línea ya validada (cantidad en centésimas, costo en centavos), lista para insertar. */
type LineaLibreValidada = { description: string; quantity: number; unitCost: number };

/** Inserta cabecera (`status: 'draft'`) + líneas de un jalón, para las vías que no
 *  resuelven producto ni traen `supplierCode` de fábrica (texto pegado y foto): cada línea
 *  nace `matchStatus: 'unmatched'`, a resolver luego con `BuscadorProducto` — mismo camino
 *  que ya usa una línea sin match de XML o manual, sin UI nueva. */
async function crearRecepcionDesdeLineas(
  source: 'texto' | 'foto',
  sesion: Sesion,
  supplierId: number,
  referenceNote: string | undefined,
  lineas: LineaLibreValidada[],
): Promise<Resultado<{ id: number }>> {
  const receiptId = await db.transaction(async (tx) => {
    const [recepcion] = await tx
      .insert(goodsReceipts)
      .values({
        source,
        status: 'draft',
        supplierId,
        branchId: sesion.branchId,
        createdByUserId: sesion.userId,
        referenceNote: referenceNote ?? null,
      })
      .returning({ id: goodsReceipts.id });
    if (!recepcion) throw new Error('No se pudo crear la recepción.');

    for (const linea of lineas) {
      const importe = Math.round((linea.unitCost * linea.quantity) / 100);
      await tx.insert(goodsReceiptItems).values({
        receiptId: recepcion.id,
        description: linea.description,
        quantity: aPesos(linea.quantity),
        unitCost: aPesos(linea.unitCost),
        taxRate: '0',
        taxAmount: aPesos(0),
        lineTotal: aPesos(importe),
        matchStatus: 'unmatched',
      });
    }

    return recepcion.id;
  });

  await recalcularTotalesSiManual(receiptId);
  revalidatePath('/recepcion');
  return { ok: true, data: { id: receiptId } };
}

const esquemaLineaLibre = (idioma: Idioma) =>
  z.object({
    description: z.string().trim().min(1, t(idioma, 'recepcion.errorFaltaDescripcion')).max(200),
    quantity: cantidadCampo(idioma),
    unitCost: dinero(idioma, t(idioma, 'recepcion.etiquetaCosto')),
  });

/** Valida cada línea ya separada por `parsearTicketTexto` con las mismas reglas que
 *  `agregarLineaManual`, señalando el número de línea si alguna falla — todo o nada, igual
 *  que el parseo mismo. */
function validarLineasLibres(
  lineas: { descripcion: string; cantidadTexto: string; costoTexto: string }[],
  idioma: Idioma,
): Resultado<LineaLibreValidada[]> {
  const esquema = esquemaLineaLibre(idioma);
  const validadas: LineaLibreValidada[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]!;
    const analisis = esquema.safeParse({
      description: linea.descripcion,
      quantity: linea.cantidadTexto,
      unitCost: linea.costoTexto,
    });
    if (!analisis.success) {
      const mensaje =
        analisis.error.issues[0]?.message ?? t(idioma, 'recepcion.errorLineaNoValida');
      return { ok: false, error: t(idioma, 'recepcion.errorLineaN', { n: i + 1, mensaje }) };
    }
    validadas.push(analisis.data);
  }
  return { ok: true, data: validadas };
}

/** Crea una pre-carga a partir de un bloque de texto pegado a mano — típicamente generado
 *  pidiéndole a Claude, fuera de este sistema, que lea la foto de un ticket. Comparte el
 *  parser y la validación de línea con `crearRecepcionDesdeFoto`; la única diferencia es de
 *  dónde sale el bloque de texto. */
export async function crearRecepcionDesdeTexto(
  datos: FormData,
): Promise<Resultado<{ id: number }>> {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();

  const cabecera = esquemaCabeceraLibre(idioma).safeParse({
    supplierId: datos.get('supplierId'),
    referenceNote: datos.get('referenceNote') || undefined,
  });
  if (!cabecera.success) {
    return {
      ok: false,
      error: cabecera.error.issues[0]?.message ?? t(idioma, 'recepcion.errorDatosNoValidos'),
    };
  }

  const texto = (datos.get('texto') as string | null) ?? '';
  const parseo = parsearTicketTexto(texto, idioma);
  if (!parseo.ok) return { ok: false, error: parseo.error };

  const lineas = validarLineasLibres(parseo.lineas, idioma);
  if (!lineas.ok) return lineas;

  return crearRecepcionDesdeLineas(
    'texto',
    sesion,
    cabecera.data.supplierId,
    cabecera.data.referenceNote,
    lineas.data,
  );
}

const TIPOS_IMAGEN_ACEPTADOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Crea una pre-carga subiendo directo la foto del ticket: solo funciona si la integración
 *  con la API de Claude está activada (hay una llave guardada en `claude_integration`).
 *  Reusa `parsearTicketTexto`/`validarLineasLibres` sobre lo que devuelva la API, exactamente
 *  igual que la vía de texto pegado — la llamada a la API es la única pieza distinta. */
export async function crearRecepcionDesdeFoto(datos: FormData): Promise<Resultado<{ id: number }>> {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();

  const [integracion] = await db
    .select({ apiKey: claudeIntegration.apiKey })
    .from(claudeIntegration)
    .limit(1);
  if (!integracion?.apiKey) {
    return { ok: false, error: t(idioma, 'recepcion.errorIntegracionNoActivada') };
  }

  const cabecera = esquemaCabeceraLibre(idioma).safeParse({
    supplierId: datos.get('supplierId'),
    referenceNote: datos.get('referenceNote') || undefined,
  });
  if (!cabecera.success) {
    return {
      ok: false,
      error: cabecera.error.issues[0]?.message ?? t(idioma, 'recepcion.errorDatosNoValidos'),
    };
  }

  const archivo = datos.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: t(idioma, 'recepcion.errorSeleccionaFoto') };
  }
  if (archivo.size > RECEPCION.fotoTicketMaximoBytes) {
    return { ok: false, error: t(idioma, 'recepcion.errorFotoPesaDemasiado') };
  }
  if (!TIPOS_IMAGEN_ACEPTADOS.has(archivo.type)) {
    return { ok: false, error: t(idioma, 'recepcion.errorFormatoImagenNoSoportado') };
  }

  const base64 = Buffer.from(await archivo.arrayBuffer()).toString('base64');
  const extraido = await extraerListadoDeTicket(
    integracion.apiKey,
    base64,
    archivo.type as 'image/jpeg' | 'image/png' | 'image/webp',
    idioma,
  );
  if (!extraido.ok) return { ok: false, error: extraido.error };

  const parseo = parsearTicketTexto(extraido.texto, idioma);
  if (!parseo.ok) return { ok: false, error: parseo.error };

  const lineas = validarLineasLibres(parseo.lineas, idioma);
  if (!lineas.ok) return lineas;

  return crearRecepcionDesdeLineas(
    'foto',
    sesion,
    cabecera.data.supplierId,
    cabecera.data.referenceNote,
    lineas.data,
  );
}

// ---------------------------------------------------------------------------------------
// Edición de líneas (solo mientras la recepción está en borrador)
// ---------------------------------------------------------------------------------------

const esquemaLinea = (idioma: Idioma) =>
  z.object({
    receiptId: z.number().int().positive(),
    productId: z.number().int().positive().optional(),
    supplierCode: z.string().trim().max(60).optional(),
    description: z.string().trim().min(1, t(idioma, 'recepcion.errorFaltaDescripcion')).max(200),
    quantity: cantidadCampo(idioma),
    unitCost: dinero(idioma, t(idioma, 'recepcion.etiquetaCosto')),
    taxRate: z.number().min(0).max(1).optional(),
  });

/** Agrega una línea a mano (captura manual, o para completar una recepción XML). */
export async function agregarLineaManual(entrada: unknown): Promise<Resultado<{ id: number }>> {
  await requerirSesion();
  const idioma = await obtenerIdioma();

  const analisis = esquemaLinea(idioma).safeParse(entrada);
  if (!analisis.success) {
    return {
      ok: false,
      error: analisis.error.issues[0]?.message ?? t(idioma, 'recepcion.errorRevisaLaLinea'),
    };
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

  const editable = await recepcionEditable(receiptId, idioma);
  if (!editable.ok) return { ok: false, error: editable.error };

  const [recepcion] = await db
    .select({ supplierId: goodsReceipts.supplierId })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);
  if (!recepcion) return { ok: false, error: t(idioma, 'recepcion.errorLaRecepcionNoExiste') };

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
  if (!creada) return { ok: false, error: t(idioma, 'recepcion.errorNoSePudoAgregarLinea') };

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

const esquemaEditarLinea = (idioma: Idioma) =>
  z.object({
    lineId: z.number().int().positive(),
    productId: z.number().int().positive().nullable().optional(),
    description: z
      .string()
      .trim()
      .min(1, t(idioma, 'recepcion.errorFaltaDescripcion'))
      .max(200)
      .optional(),
    quantity: cantidadCampo(idioma).optional(),
    unitCost: dinero(idioma, t(idioma, 'recepcion.etiquetaCosto')).optional(),
  });

/** Edita cantidad/costo/producto/descripción de una línea existente. */
export async function editarLinea(entrada: unknown): Promise<Resultado<undefined>> {
  await requerirSesion();
  const idioma = await obtenerIdioma();

  const analisis = esquemaEditarLinea(idioma).safeParse(entrada);
  if (!analisis.success) {
    return {
      ok: false,
      error: analisis.error.issues[0]?.message ?? t(idioma, 'recepcion.errorRevisaLaLinea'),
    };
  }
  const { lineId, productId, description, quantity, unitCost } = analisis.data;

  const [fila] = await db
    .select({ item: goodsReceiptItems, status: goodsReceipts.status })
    .from(goodsReceiptItems)
    .innerJoin(goodsReceipts, eq(goodsReceiptItems.receiptId, goodsReceipts.id))
    .where(eq(goodsReceiptItems.id, lineId))
    .limit(1);
  if (!fila) return { ok: false, error: t(idioma, 'recepcion.errorLineaNoExiste') };
  if (fila.status !== 'draft') {
    return { ok: false, error: t(idioma, 'recepcion.errorSoloBorrador') };
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
  const idioma = await obtenerIdioma();

  const analisis = z.object({ lineId: z.number().int().positive() }).safeParse(entrada);
  if (!analisis.success) return { ok: false, error: t(idioma, 'recepcion.errorLineaNoValida') };
  const { lineId } = analisis.data;

  const [fila] = await db
    .select({ receiptId: goodsReceiptItems.receiptId, status: goodsReceipts.status })
    .from(goodsReceiptItems)
    .innerJoin(goodsReceipts, eq(goodsReceiptItems.receiptId, goodsReceipts.id))
    .where(eq(goodsReceiptItems.id, lineId))
    .limit(1);
  if (!fila) return { ok: false, error: t(idioma, 'recepcion.errorLineaNoExiste') };
  if (fila.status !== 'draft') {
    return { ok: false, error: t(idioma, 'recepcion.errorSoloBorrador') };
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
  const idioma = await obtenerIdioma();

  const analisis = z
    .object({ lineId: z.number().int().positive(), productId: z.number().int().positive() })
    .safeParse(entrada);
  if (!analisis.success) return { ok: false, error: t(idioma, 'recepcion.errorDatosNoValidos') };
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
  if (!fila) return { ok: false, error: t(idioma, 'recepcion.errorLineaNoExiste') };
  if (fila.status !== 'draft') {
    return { ok: false, error: t(idioma, 'recepcion.errorSoloBorrador') };
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
  const idioma = await obtenerIdioma();

  const analisis = z
    .object({
      lineId: z.number().int().positive(),
      categoryId: z.number().int().positive().optional(),
      code: z.string().trim().max(60).optional(),
    })
    .safeParse(entrada);
  if (!analisis.success) return { ok: false, error: t(idioma, 'recepcion.errorDatosNoValidos') };
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
  if (!fila) return { ok: false, error: t(idioma, 'recepcion.errorLineaNoExiste') };
  if (fila.status !== 'draft') {
    return { ok: false, error: t(idioma, 'recepcion.errorSoloBorrador') };
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
  if (!creado) return { ok: false, error: t(idioma, 'recepcion.errorNoSePudoCrearProducto') };

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

const CLAVE_ERROR_AUTORIZACION: Record<CodigoErrorAutorizacion, ClaveI18n> = {
  'sin-lineas': 'recepcion.errorSinLineas',
  'lineas-sin-vincular': 'recepcion.errorLineasSinVincular',
  descuadre: 'recepcion.errorDescuadre',
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
  const idioma = await obtenerIdioma();

  const analisis = z.coerce.number().int().positive().safeParse(datos.get('receiptId'));
  if (!analisis.success) return { error: t(idioma, 'recepcion.errorRecepcionNoValida') };
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
      return { error: t(idioma, CLAVE_ERROR_AUTORIZACION[err.codigo]) };
    }
    return { error: t(idioma, 'recepcion.errorNoSePudoAutorizar') };
  }

  if (resultado === 'ya-resuelta') return { error: t(idioma, 'recepcion.errorYaResuelta') };

  revalidatePath('/recepcion');
  revalidatePath(`/recepcion/${receiptId}`);
  revalidatePath('/inventario');
  revalidatePath('/productos');
  return { ok: true, mensaje: t(idioma, 'recepcion.exitoAutorizada') };
}

/** Descarta una pre-carga: nunca toca inventario. El UUID queda libre automáticamente (el
 *  índice único de `goods_receipts.cfdi_uuid` es parcial, solo cubre estados no
 *  descartados — ver `src/db/schema.ts`), así que la misma factura puede reimportarse. */
export async function descartarRecepcion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();

  const analisis = z.coerce.number().int().positive().safeParse(datos.get('receiptId'));
  if (!analisis.success) return { error: t(idioma, 'recepcion.errorRecepcionNoValida') };
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

  if (descartadas.length === 0) return { error: t(idioma, 'recepcion.errorYaResuelta') };

  revalidatePath('/recepcion');
  revalidatePath(`/recepcion/${receiptId}`);
  return { ok: true, mensaje: t(idioma, 'recepcion.exitoDescartada') };
}

// ---------------------------------------------------------------------------------------
// Integración con la API de Claude (vía "foto") — activación
// ---------------------------------------------------------------------------------------

/** Si hay una llave guardada, sin exponer su valor — decide si la UI muestra la pestaña
 *  "Subir foto". Cualquier sesión puede consultarlo; solo `admin` puede cambiarlo. */
export async function estadoIntegracionClaude(): Promise<{ activa: boolean }> {
  await requerirSesion();
  const [fila] = await db
    .select({ apiKey: claudeIntegration.apiKey })
    .from(claudeIntegration)
    .limit(1);
  return { activa: Boolean(fila?.apiKey) };
}

const esquemaClaveApi = (idioma: Idioma) =>
  z.object({
    apiKey: z.string().trim().min(10, t(idioma, 'recepcion.errorClaveNoValida')),
  });

/** Guarda (o reemplaza) la llave de la integración. Admin-only. */
export async function guardarClaveApiClaude(datos: FormData): Promise<Resultado<undefined>> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const idioma = await obtenerIdioma();

  const analisis = esquemaClaveApi(idioma).safeParse({ apiKey: datos.get('apiKey') });
  if (!analisis.success) {
    return {
      ok: false,
      error: analisis.error.issues[0]?.message ?? t(idioma, 'recepcion.errorClaveInvalida'),
    };
  }

  await db
    .update(claudeIntegration)
    .set({
      apiKey: analisis.data.apiKey,
      updatedByUserId: permiso.sesion.userId,
      updatedAt: new Date(),
    })
    .where(eq(claudeIntegration.id, 1));

  revalidatePath('/recepcion/nueva');
  return { ok: true, data: undefined };
}

/** Apaga la integración (borra la llave guardada, sin borrar el historial de recepciones
 *  `source: 'foto'` que ya se hubieran creado). Admin-only. */
export async function desactivarIntegracionClaude(): Promise<Resultado<undefined>> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { ok: false, error: permiso.error };

  await db
    .update(claudeIntegration)
    .set({ apiKey: null, updatedByUserId: permiso.sesion.userId, updatedAt: new Date() })
    .where(eq(claudeIntegration.id, 1));

  revalidatePath('/recepcion/nueva');
  return { ok: true, data: undefined };
}
