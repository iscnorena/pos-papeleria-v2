import { POS } from '@/config/pos';

// §2 — Dinero. En Postgres, `numeric(12,2)`. En TypeScript, TODA la aritmética se hace en
// centavos con enteros: `2.10 + 4.20 !== 6.30` en coma flotante, y esa diferencia termina
// en un corte de caja descuadrado.
//
// La conversión ocurre exactamente en dos fronteras: al leer de la base y al escribir a
// ella. En medio, todo son centavos enteros.

/** Centavos → cadena `numeric` para guardar en Postgres. Frontera de escritura. */
export function aPesos(centavos: number): string {
  return (Math.round(centavos) / 100).toFixed(2);
}

/**
 * Texto (de la base o de un formulario) → centavos enteros. Frontera de lectura.
 *
 * Acepta `1234.56`, `$1,234.56`, `1 234,56` y coma decimal, porque en un mostrador el
 * texto llega como llega. Devuelve `null` si no hay un número reconocible: quien llama
 * decide si eso es un error de validación o un cero.
 */
export function aCentavos(texto: string | number | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === 'number') {
    return Number.isFinite(texto) ? Math.round(texto * 100) : null;
  }

  let limpio = texto.trim().replace(/[\s$]/g, '');
  if (limpio === '') return null;

  const tieneComa = limpio.includes(',');
  const tienePunto = limpio.includes('.');
  if (tieneComa && tienePunto) {
    // El último separador que aparece es el decimal: «1.234,56» y «1,234.56» son ambos válidos.
    const separador = limpio.lastIndexOf(',') > limpio.lastIndexOf('.') ? ',' : '.';
    const miles = separador === ',' ? '.' : ',';
    limpio = limpio.split(miles).join('').replace(separador, '.');
  } else if (tieneComa) {
    // Una coma sola: decimal si deja 1 o 2 dígitos detrás («12,5»), separador de miles si no.
    const [, decimales = ''] = limpio.split(',');
    limpio = decimales.length <= 2 ? limpio.replace(',', '.') : limpio.split(',').join('');
  }

  if (!/^-?\d*\.?\d*$/.test(limpio) || limpio === '.' || limpio === '-') return null;

  const numero = Number(limpio);
  if (!Number.isFinite(numero)) return null;

  // Media unidad hacia arriba y solo aquí, nunca en pasos intermedios (§2).
  return Math.round(numero * 100);
}

/** Centavos → texto para mostrar, con símbolo. Nunca para guardar. */
export function formatear(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(Math.round(centavos));
  const enteros = Math.floor(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimales = (absoluto % 100).toString().padStart(2, '0');
  return `${signo}${POS.simboloMoneda}${enteros}.${decimales}`;
}

/**
 * Cantidades de producto: se guardan como `numeric(12,2)` porque hay cosas que se venden
 * por metro o por kilo. Se manejan en centésimas enteras por el mismo motivo que el dinero.
 */
export function aCentesimas(texto: string | number | null | undefined): number | null {
  return aCentavos(texto);
}

/** Centésimas → texto de cantidad, sin ceros de adorno: `3` en vez de `3.00`. */
export function formatearCantidad(centesimas: number): string {
  const entero = Math.round(centesimas);
  if (entero % 100 === 0) return String(entero / 100);
  return (entero / 100).toFixed(2);
}
