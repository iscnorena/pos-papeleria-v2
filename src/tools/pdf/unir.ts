import { PDFDocument } from 'pdf-lib';

import type { ArchivoPdf } from './pdfArchivo';

export { cargarPdf, type ArchivoPdf } from './pdfArchivo';

// Todo ocurre en el navegador con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto: los PDF del cliente nunca suben a ningún servidor.

/** Une varios PDF, en el orden dado, en uno solo. */
export async function unirPdfs(archivos: ArchivoPdf[]): Promise<Uint8Array> {
  const resultado = await PDFDocument.create();
  for (const archivo of archivos) {
    const documento = await PDFDocument.load(archivo.bytes, { ignoreEncryption: true });
    const paginas = await resultado.copyPages(documento, documento.getPageIndices());
    for (const pagina of paginas) resultado.addPage(pagina);
  }
  return resultado.save();
}
