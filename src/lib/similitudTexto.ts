// Similitud de texto por trigramas de caracteres (coeficiente de Dice), pura y sin
// dependencias. Mismo principio que `pg_trgm` de Postgres (usado en Recepción de Mercancía
// para sugerir productos por similitud contra un CFDI), pero calculado en el navegador: en
// Precarga de Ticket por Voz el catálogo completo ya vive en memoria del cliente (§Fase 4,
// `PuntoDeVenta.tsx`), así que ir a la base de datos por cada palabra dictada sería una
// vuelta de red innecesaria — y la caja está pensada para seguir armando el ticket aunque
// el internet parpadee a media venta.

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos: "línea" y "linea" deben parecerse
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigramas(texto: string): Set<string> {
  const t = `  ${normalizar(texto)} `; // padding: que las palabras cortas también den trigramas
  const set = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) set.add(t.slice(i, i + 3));
  return set;
}

/**
 * Coeficiente de Dice entre los trigramas de dos textos: 1 = idénticos, 0 = nada en común.
 * Tolera variaciones típicas de transcripción de voz o de tipeo ("Bic" → "Bik") porque la
 * mayoría de los trigramas del texto siguen coincidiendo aunque cambie una letra.
 */
export function similitud(a: string, b: string): number {
  const ta = trigramas(a);
  const tb = trigramas(b);
  if (ta.size === 0 || tb.size === 0) return 0;

  let comunes = 0;
  for (const tri of ta) if (tb.has(tri)) comunes++;
  return (2 * comunes) / (ta.size + tb.size);
}

export type CandidatoSimilitud<T> = { item: T; similitud: number };

/** Los `limite` elementos de `catalogo` más parecidos a `texto`, por encima de `umbral`. */
export function mejoresCoincidencias<T>(
  texto: string,
  catalogo: T[],
  clave: (item: T) => string,
  { limite = 5, umbral = 0.2 }: { limite?: number; umbral?: number } = {},
): CandidatoSimilitud<T>[] {
  return catalogo
    .map((item) => ({ item, similitud: similitud(texto, clave(item)) }))
    .filter((c) => c.similitud >= umbral)
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, limite);
}
