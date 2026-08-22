'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { RECEPCION } from '@/config/pos';
import { db } from '@/db';
import { productSuppliers, products } from '@/db/schema';
import { calcularCostoConsolidado } from '@/lib/costeo';
import { asegurarInventario } from '@/lib/inventario';
import { obtenerIdioma, t, type Idioma } from '@/lib/i18n/servidor';
import { aCentavos, aPesos } from '@/lib/money';
import { erroresDeZod, type EstadoFormulario, type Resultado } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

// El dinero entra como texto del formulario y sale como `numeric` para Postgres. En medio
// vive en centavos enteros (§2): esta es una de las dos fronteras de conversión.
const dinero = (idioma: Idioma, etiqueta: string) =>
  z
    .string()
    .trim()
    .transform((texto, ctx) => {
      const centavos = aCentavos(texto);
      if (centavos === null) {
        ctx.addIssue({
          code: 'custom',
          message: t(idioma, 'comun.cantidadNoValida', { etiqueta }),
        });
        return z.NEVER;
      }
      if (centavos < 0) {
        ctx.addIssue({
          code: 'custom',
          message: t(idioma, 'comun.cantidadNegativa', { etiqueta }),
        });
        return z.NEVER;
      }
      return centavos;
    });

const esquema = (idioma: Idioma) =>
  z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z
      .string()
      .trim()
      .min(1, t(idioma, 'productos.errorNombreRequerido'))
      .max(160, t(idioma, 'admin.nombreDemasiadoLargo')),
    code: z.string().trim().max(60, t(idioma, 'admin.codigoDemasiadoLargo')).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    costPrice: dinero(idioma, t(idioma, 'admin.colCosto')),
    salePrice: dinero(idioma, t(idioma, 'productos.precioVentaEtiqueta')),
    managesInventory: z.boolean(),
    openPrice: z.boolean(),
    expiryDate: z.string().trim().optional(),
    isActive: z.boolean(),
  });

export async function guardarProducto(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };
  const idioma = await obtenerIdioma();

  const analisis = esquema(idioma).safeParse({
    id: datos.get('id') || undefined,
    name: datos.get('name'),
    code: datos.get('code') || undefined,
    categoryId: datos.get('categoryId') || undefined,
    costPrice: datos.get('costPrice') ?? '0',
    salePrice: datos.get('salePrice') ?? '0',
    managesInventory: datos.get('managesInventory') === 'on',
    openPrice: datos.get('openPrice') === 'on',
    expiryDate: datos.get('expiryDate') || undefined,
    isActive: datos.get('isActive') === 'on',
  });
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  const { id, costPrice, salePrice, expiryDate, categoryId, ...resto } = analisis.data;

  const valores = {
    ...resto,
    costPrice: aPesos(costPrice),
    salePrice: aPesos(salePrice),
    categoryId: categoryId ?? null,
    expiryDate: expiryDate && expiryDate !== '' ? expiryDate : null,
  };

  try {
    if (id) {
      await db.update(products).set(valores).where(eq(products.id, id));
      // Si el producto pasó a manejar inventario después de creado, le faltan sus filas.
      if (valores.managesInventory) await asegurarInventario(id);
    } else {
      const [creado] = await db.insert(products).values(valores).returning({ id: products.id });
      if (!creado) return { error: t(idioma, 'productos.errorNoSePudoCrear') };
      if (valores.managesInventory) await asegurarInventario(creado.id);
    }
  } catch {
    return { error: t(idioma, 'productos.errorNoSePudoGuardar') };
  }

  revalidatePath('/productos');
  revalidatePath('/inventario');
  return {
    ok: true,
    mensaje: id ? t(idioma, 'productos.exitoActualizado') : t(idioma, 'productos.exitoCreado'),
  };
}

/**
 * Marca un proveedor como preferido para un producto (comparativo de costo por proveedor,
 * docs/modulo-recepcion-mercancia-xml.md). Solo una fila por producto queda `isPreferred`:
 * apaga las demás en la misma transacción. Si la regla activa de
 * `RECEPCION.reglaCostoConsolidado` es `'proveedor_preferido'`, el catálogo se recalcula de
 * inmediato para reflejar el cambio sin esperar a la siguiente recepción autorizada.
 */
export async function marcarProveedorPreferido(entrada: unknown): Promise<Resultado<undefined>> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const idioma = await obtenerIdioma();

  const analisis = z
    .object({ productId: z.number().int().positive(), supplierId: z.number().int().positive() })
    .safeParse(entrada);
  if (!analisis.success) return { ok: false, error: t(idioma, 'admin.datosNoValidos') };
  const { productId, supplierId } = analisis.data;

  await db.transaction(async (tx) => {
    await tx
      .update(productSuppliers)
      .set({ isPreferred: false })
      .where(eq(productSuppliers.productId, productId));
    await tx
      .update(productSuppliers)
      .set({ isPreferred: true })
      .where(
        and(eq(productSuppliers.productId, productId), eq(productSuppliers.supplierId, supplierId)),
      );
  });

  if (RECEPCION.reglaCostoConsolidado === 'proveedor_preferido') {
    const candidatos = await db
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
      await db
        .update(products)
        .set({ costPrice: aPesos(nuevoCosto) })
        .where(eq(products.id, productId));
    }
  }

  revalidatePath('/productos');
  return { ok: true, data: undefined };
}
