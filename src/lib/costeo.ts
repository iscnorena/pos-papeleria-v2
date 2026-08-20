import { RECEPCION, type ReglaCostoConsolidado } from '@/config/pos';

// Recepción de Mercancía — decisión de modelo de costo (docs/modulo-recepcion-mercancia-xml.md):
// cada producto puede comprarse a varios proveedores a costos distintos (nivel 1,
// `product_suppliers.lastCost`). El catálogo (`products.costPrice`) usa un único costo
// consolidado, que es el que ve el resto del sistema (margen, precio sugerido, reportes).
// Esta función decide ese consolidado. Módulo puro, sin tocar la base, para poder probarla
// con Vitest igual que `venta.ts`.

export type CandidatoCostoProveedor = {
  supplierId: number;
  isPreferred: boolean;
  /** Centavos. */
  lastCost: number;
  lastCostAt: Date | null;
};

/**
 * Decide qué costo por proveedor se refleja en `products.costPrice`.
 *
 * Regla `'ultima_compra'` (por defecto): el candidato con `lastCostAt` más reciente entre
 * todos los proveedores, sin importar cuál sea.
 *
 * Regla `'proveedor_preferido'`: usa el candidato marcado `isPreferred` si tiene costo
 * registrado; si no hay preferido con costo, cae a la misma regla de última compra.
 *
 * `null` si ningún candidato tiene costo todavía (no se toca `costPrice`).
 */
export function calcularCostoConsolidado(
  candidatos: CandidatoCostoProveedor[],
  regla: ReglaCostoConsolidado = RECEPCION.reglaCostoConsolidado,
): number | null {
  const conCosto = candidatos.filter(
    (c): c is CandidatoCostoProveedor & { lastCostAt: Date } => c.lastCostAt !== null,
  );
  if (conCosto.length === 0) return null;

  if (regla === 'proveedor_preferido') {
    const preferido = conCosto.find((c) => c.isPreferred);
    if (preferido) return preferido.lastCost;
  }

  return conCosto.reduce((masReciente, actual) =>
    actual.lastCostAt > masReciente.lastCostAt ? actual : masReciente,
  ).lastCost;
}

/**
 * `true` cuando el costo nuevo se aleja del último costo registrado (mismo proveedor) más
 * allá de `RECEPCION.alertaVariacionCostoFraccion`. Es solo advertencia — nunca bloquea.
 */
export function costoVarioSignificativamente(
  costoNuevo: number,
  costoAnterior: number | null,
  fraccion: number = RECEPCION.alertaVariacionCostoFraccion,
): boolean {
  if (costoAnterior === null || costoAnterior === 0) return false;
  return Math.abs(costoNuevo - costoAnterior) / costoAnterior > fraccion;
}
