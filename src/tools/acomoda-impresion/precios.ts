// §7.2 de la Fase 7 — precios. **Los números son del original y están en uso: no se
// cambian ni se redondean** (§10).
//
// Se manejan en centavos enteros, como todo el dinero del sistema (§2).

/** Color: precio POR IMAGEN, según cuántas celdas tiene el layout. */
export const PRECIO_COLOR_POR_CELDAS: Record<number, number> = {
  1: 1000, // $10.00
  2: 500, // $5.00
  4: 300, // $3.00
  6: 200, // $2.00
  9: 100, // $1.00
};

/** Blanco y negro: precio POR HOJA. */
export const PRECIO_BN_POR_DEFECTO = 100; // $1.00

/** Respaldo cuando el layout no está en la tabla (por ejemplo una retícula 3×4). */
export const PRECIO_RESPALDO = 1000; // $10.00

export type Precios = {
  color: Record<number, number>;
  blancoYNegro: number;
};

export const PRECIOS_POR_DEFECTO: Precios = {
  color: { ...PRECIO_COLOR_POR_CELDAS },
  blancoYNegro: PRECIO_BN_POR_DEFECTO,
};

/**
 * El total, en centavos:
 *
 *   si totalImagenes == 0             → 0
 *   si NO es color                    → ceil(totalImagenes / celdasPorPagina) × precioBN
 *   si es color                       → totalImagenes × precioColor[celdasPorPagina]
 *   si el layout no está en la tabla  → totalImagenes × 10.00   (respaldo)
 *
 * Lo que NO se arregla (§7.7): el precio de color asume que todas las imágenes van al
 * precio del layout actual. Es una simplificación deliberada del negocio.
 */
export function calcularTotal(opciones: {
  totalImagenes: number;
  celdasPorPagina: number;
  esColor: boolean;
  precios: Precios;
}): number {
  const { totalImagenes, celdasPorPagina, esColor, precios } = opciones;
  if (totalImagenes === 0) return 0;
  if (celdasPorPagina <= 0) return 0;

  if (!esColor) {
    const hojas = Math.ceil(totalImagenes / celdasPorPagina);
    return hojas * precios.blancoYNegro;
  }

  const porImagen = precios.color[celdasPorPagina] ?? PRECIO_RESPALDO;
  return totalImagenes * porImagen;
}
