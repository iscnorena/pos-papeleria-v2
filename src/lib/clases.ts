/**
 * Une clases condicionales. Es lo que haría `clsx`, en seis líneas: §1 prohíbe agregar
 * dependencias que no hagan falta, y esto no da para una.
 */
export function clases(...partes: Array<string | false | null | undefined>): string {
  return partes.filter(Boolean).join(' ');
}
