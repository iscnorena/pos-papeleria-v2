'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { inventories, products, saleItems, sales } from '@/db/schema';
import type { EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

/**
 * §7.6 — cancelar una venta. Solo `admin`.
 *
 * Marca `status = 'cancelled'` y **devuelve el stock** de cada renglón cuyo producto maneje
 * inventario. **No se borra nada**: una venta cancelada sigue en el historial, tachada y
 * con distintivo `sello` (§10).
 *
 * Todo va en una transacción, por la misma razón que la venta: o se cancela y vuelve el
 * stock, o no pasa nada.
 */
export async function cancelarVenta(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };

  const analisis = z.coerce.number().int().positive().safeParse(datos.get('saleId'));
  if (!analisis.success) return { error: 'Venta no válida.' };
  const saleId = analisis.data;

  try {
    const resultado = await db.transaction(async (tx) => {
      // La condición `status = 'completed'` va en el propio UPDATE: si dos administradores
      // cancelan a la vez, solo uno encuentra fila y el stock se devuelve una sola vez.
      const canceladas = await tx
        .update(sales)
        .set({ status: 'cancelled' })
        .where(and(eq(sales.id, saleId), eq(sales.status, 'completed')))
        .returning({ id: sales.id, branchId: sales.branchId });

      const venta = canceladas[0];
      if (!venta) return 'ya-cancelada' as const;

      const renglones = await tx
        .select({
          productId: saleItems.productId,
          quantity: saleItems.quantity,
          manejaInventario: products.managesInventory,
        })
        .from(saleItems)
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, saleId));

      for (const renglon of renglones) {
        if (!renglon.manejaInventario) continue;
        await tx
          .update(inventories)
          .set({ stock: sql`${inventories.stock} + ${renglon.quantity}` })
          .where(
            and(
              eq(inventories.productId, renglon.productId),
              eq(inventories.branchId, venta.branchId),
            ),
          );
      }

      return 'cancelada' as const;
    });

    if (resultado === 'ya-cancelada') {
      return { error: 'Esa venta ya estaba cancelada.' };
    }
  } catch {
    return { error: 'No se pudo cancelar la venta. Inténtalo de nuevo.' };
  }

  revalidatePath('/historial');
  revalidatePath(`/historial/${saleId}`);
  revalidatePath('/reportes');
  revalidatePath('/inventario');
  return { ok: true, mensaje: 'Venta cancelada y existencias devueltas.' };
}
