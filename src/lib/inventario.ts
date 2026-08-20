import 'server-only';

import { db } from '@/db';
import { branches, inventories } from '@/db/schema';

/**
 * Crea la fila de inventario de un producto en TODAS las sucursales, con stock 0, si no
 * existe todavía. `onConflictDoNothing` sobre el índice único (product_id, branch_id) lo
 * hace repetible: al agregar una sucursal nueva se vuelve a llamar y solo aparecen las que
 * faltaban. Usado al crear/editar un producto (`productos/acciones.ts`) y al crear un
 * producto nuevo desde una línea de Recepción de Mercancía sin match
 * (`recepcion/acciones.ts`).
 */
export async function asegurarInventario(productId: number): Promise<void> {
  const sucursales = await db.select({ id: branches.id }).from(branches);
  if (sucursales.length === 0) return;

  await db
    .insert(inventories)
    .values(sucursales.map((s) => ({ productId, branchId: s.id, stock: '0' })))
    .onConflictDoNothing();
}
