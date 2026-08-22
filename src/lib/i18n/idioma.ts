// Constantes puras compartidas por servidor y cliente: nombre de la cookie y validación
// del valor. Separado de `nucleo.ts` (que trae el diccionario, más pesado) para que el
// script anti-parpadeo o cualquier lectura mínima no tengan que cargar los diccionarios.

export type Idioma = 'es' | 'en';

export const IDIOMA_COOKIE = 'pos.idioma';
export const IDIOMA_POR_DEFECTO: Idioma = 'es';

export function esIdioma(valor: unknown): valor is Idioma {
  return valor === 'es' || valor === 'en';
}
