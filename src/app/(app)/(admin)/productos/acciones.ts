'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { branches, inventories, products } from '@/db/schema';
import { aCentavos, aPesos } from '@/lib/money';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

// El dinero entra como texto del formulario y sale como `numeric` para Postgres. En medio
// vive en centavos enteros (§2): esta es una de las dos fronteras de conversión.
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

const esquema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'El producto necesita un nombre.')
    .max(160, 'Nombre demasiado largo.'),
  code: z.string().trim().max(60, 'Código demasiado largo.').optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  costPrice: dinero('El costo'),
  salePrice: dinero('El precio de venta'),
  managesInventory: z.boolean(),
  expiryDate: z.string().trim().optional(),
  isActive: z.boolean(),
});

export async function guardarProducto(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };

  const analisis = esquema.safeParse({
    id: datos.get('id') || undefined,
    name: datos.get('name'),
    code: datos.get('code') || undefined,
    categoryId: datos.get('categoryId') || undefined,
    costPrice: datos.get('costPrice') ?? '0',
    salePrice: datos.get('salePrice') ?? '0',
    managesInventory: datos.get('managesInventory') === 'on',
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
      if (!creado) return { error: 'No se pudo crear el producto.' };
      if (valores.managesInventory) await asegurarInventario(creado.id);
    }
  } catch {
    return { error: 'No se pudo guardar el producto. Inténtalo de nuevo.' };
  }

  revalidatePath('/productos');
  revalidatePath('/inventario');
  return { ok: true, mensaje: id ? 'Producto actualizado.' : 'Producto creado.' };
}

/**
 * Crea la fila de inventario del producto en TODAS las sucursales, con stock 0. Portado
 * tal cual de la versión Laravel: si una sucursal no tiene fila, el producto no se puede
 * ni contar ni ajustar ahí, y el hueco solo se descubre vendiendo.
 *
 * `onConflictDoNothing` sobre el índice único (product_id, branch_id) lo hace repetible:
 * al agregar una sucursal nueva se vuelve a llamar y solo aparecen las que faltaban.
 */
async function asegurarInventario(productId: number): Promise<void> {
  const sucursales = await db.select({ id: branches.id }).from(branches);
  if (sucursales.length === 0) return;

  await db
    .insert(inventories)
    .values(sucursales.map((s) => ({ productId, branchId: s.id, stock: '0' })))
    .onConflictDoNothing();
}
