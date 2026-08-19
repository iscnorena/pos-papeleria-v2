import { degrees, PDFDocument } from 'pdf-lib';

import { analizarRangos, type RangoPaginas } from './dividir';

// Todo ocurre en el navegador con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto: el PDF del cliente nunca sube a ningún servidor.

/** 90/180/270, en el sentido de las manecillas del reloj. Se suma a la rotación que ya
 * traiga cada página (no la reemplaza), para que "90° derecha" dos veces dé 180°. */
export type AnguloRotacion = 90 | 180 | 270;

/** Convierte un texto de rangos (mismo formato que Dividir) a los índices 0-indexados que
 * pide `rotarPdf`. `texto` vacío o solo espacios significa "todas las páginas". */
export function paginasARotar(texto: string, totalPaginas: number): Set<number> | null {
  if (texto.trim().length === 0) return null;
  const rangos = analizarRangos(texto, totalPaginas);
  return indicesDeRangos(rangos);
}

function indicesDeRangos(rangos: RangoPaginas[]): Set<number> {
  const indices = new Set<number>();
  for (const rango of rangos) {
    for (let p = rango.desde; p <= rango.hasta; p++) indices.add(p - 1);
  }
  return indices;
}

/** Rota las páginas indicadas (0-indexadas; `null` = todas) el ángulo dado, sumado a lo
 * que ya traiga cada una. */
export async function rotarPdf(
  bytes: Uint8Array,
  angulo: AnguloRotacion,
  indices: Set<number> | null,
): Promise<Uint8Array> {
  const documento = await PDFDocument.load(bytes, { ignoreEncryption: true });

  documento.getPages().forEach((pagina, indice) => {
    if (indices && !indices.has(indice)) return;
    const actual = pagina.getRotation().angle;
    pagina.setRotation(degrees((((actual + angulo) % 360) + 360) % 360));
  });

  return documento.save();
}
