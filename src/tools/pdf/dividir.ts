import { PDFDocument } from 'pdf-lib';

// Todo ocurre en el navegador con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto: el PDF del cliente nunca sube a ningún servidor.

export type RangoPaginas = { desde: number; hasta: number }; // 1-indexado, inclusive

/**
 * "1-3, 5, 7-8" → tres rangos. Lanza con un mensaje listo para mostrar (no un error
 * genérico) si algún trozo no tiene forma de rango, o se sale de [1, totalPaginas].
 */
export function analizarRangos(texto: string, totalPaginas: number): RangoPaginas[] {
  const partes = texto
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length === 0) {
    throw new Error('Escribe al menos un rango de páginas, ej. "1-3, 4-6".');
  }

  return partes.map((parte) => {
    const coincide = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(parte);
    if (!coincide) {
      throw new Error(`"${parte}" no es un rango válido. Usa un número o "inicio-fin".`);
    }
    const desde = Number(coincide[1]);
    const hasta = coincide[2] ? Number(coincide[2]) : desde;
    if (desde < 1 || hasta < desde) {
      throw new Error(`"${parte}" no es un rango válido.`);
    }
    if (hasta > totalPaginas) {
      throw new Error(`"${parte}" se pasa: el PDF solo tiene ${totalPaginas} páginas.`);
    }
    return { desde, hasta };
  });
}

/** Texto de rangos que separa el PDF en un archivo por página, ej. "1, 2, 3". */
export function textoUnaPorPagina(totalPaginas: number): string {
  return Array.from({ length: totalPaginas }, (_, i) => i + 1).join(', ');
}

/** Divide un PDF según los rangos dados; un archivo resultante por rango, en orden. */
export async function dividirPdf(bytes: Uint8Array, rangos: RangoPaginas[]): Promise<Uint8Array[]> {
  const documento = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const partes: Uint8Array[] = [];
  for (const rango of rangos) {
    const nuevo = await PDFDocument.create();
    const indices = Array.from(
      { length: rango.hasta - rango.desde + 1 },
      (_, i) => rango.desde - 1 + i,
    );
    const paginas = await nuevo.copyPages(documento, indices);
    for (const pagina of paginas) nuevo.addPage(pagina);
    partes.push(await nuevo.save());
  }
  return partes;
}
