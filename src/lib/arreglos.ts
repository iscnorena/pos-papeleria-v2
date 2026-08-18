/** Mueve un elemento de una posición a otra. Es lo que hace el reordenado por arrastre o
 * por botones ↑↓, en cualquier lista de archivos/imágenes del navegador. */
export function reordenar<T>(lista: T[], desde: number, hasta: number): T[] {
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= lista.length || hasta >= lista.length) {
    return lista;
  }
  const copia = [...lista];
  const [movido] = copia.splice(desde, 1);
  if (movido !== undefined) copia.splice(hasta, 0, movido);
  return copia;
}
