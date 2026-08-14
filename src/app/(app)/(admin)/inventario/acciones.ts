'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { inventories } from '@/db/schema';
import { aCentesimas, aPesos } from '@/lib/money';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

const esquema = z.object({
  productId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive(),
  stock: z
    .string()
    .trim()
    .transform((texto, ctx) => {
      const centesimas = aCentesimas(texto);
      if (centesimas === null) {
        ctx.addIssue({ code: 'custom', message: 'Cantidad no válida.' });
        return z.NEVER;
      }
      return centesimas;
    }),
});

/**
 * Ajuste manual: fija la existencia a lo contado, no suma ni resta. Es lo que hace falta
 * después de un inventario físico, y evita el error clásico de aplicar dos veces el mismo
 * ajuste.
 *
 * La condición lleva SIEMPRE las dos llaves (producto y sucursal): el criterio 3 de esta
 * fase es justamente que ajustar en la sucursal 1 no toque la 2.
 */
export async function ajustarExistencia(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };

  const analisis = esquema.safeParse({
    productId: datos.get('productId'),
    branchId: datos.get('branchId'),
    stock: datos.get('stock'),
  });
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  const { productId, branchId, stock } = analisis.data;

  try {
    const actualizadas = await db
      .update(inventories)
      .set({ stock: aPesos(stock) })
      .where(and(eq(inventories.productId, productId), eq(inventories.branchId, branchId)))
      .returning({ id: inventories.id });

    if (actualizadas.length === 0) {
      // Puede pasar si el producto se creó sin manejar inventario y luego se activó.
      await db.insert(inventories).values({ productId, branchId, stock: aPesos(stock) });
    }
  } catch {
    return { error: 'No se pudo ajustar la existencia. Inténtalo de nuevo.' };
  }

  revalidatePath('/inventario');
  return { ok: true, mensaje: 'Existencia ajustada.' };
}
