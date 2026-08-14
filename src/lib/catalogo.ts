import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { inventories, productCategories, products } from '@/db/schema';

// El catálogo que ve la caja. Vive aparte de la pantalla porque lo usan dos cosas: el punto
// de venta (Fase 4, que se lo lleva completo al cliente) y las pruebas del criterio 4 de la
// Fase 2 — «desactivar un producto lo saca del catálogo de la caja sin borrar su historial».

export type ProductoDeCaja = {
  id: number;
  nombre: string;
  codigo: string | null;
  categoria: string | null;
  categoriaId: number | null;
  precio: string;
  costo: string;
  manejaInventario: boolean;
  existencia: string;
};

/**
 * Productos vendibles en una sucursal: solo los activos. Un producto desactivado sigue en
 * la base y en el historial, pero no vuelve a aparecer aquí.
 *
 * El `leftJoin` con inventario es deliberado: los servicios (impresión, engargolado) no
 * manejan existencia y no tienen fila, y aun así deben poder cobrarse.
 */
export async function catalogoDeSucursal(branchId: number): Promise<ProductoDeCaja[]> {
  const filas = await db
    .select({
      id: products.id,
      nombre: products.name,
      codigo: products.code,
      categoria: productCategories.name,
      categoriaId: products.categoryId,
      precio: products.salePrice,
      costo: products.costPrice,
      manejaInventario: products.managesInventory,
      existencia: inventories.stock,
    })
    .from(products)
    .leftJoin(
      inventories,
      and(eq(inventories.productId, products.id), eq(inventories.branchId, branchId)),
    )
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name));

  return filas.map((f) => ({ ...f, existencia: f.existencia ?? '0' }));
}
