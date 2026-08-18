import { PDFDocument } from 'pdf-lib';

// PDF mínimos y válidos para las pruebas de Unir PDF — necesitan serlo de verdad (no un
// buffer cualquiera con extensión .pdf), porque `cargarPdf` valida con `PDFDocument.load`.

export async function archivoPdf(nombre: string, paginas = 1) {
  const documento = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) documento.addPage([200, 300]);
  const bytes = await documento.save();
  return { name: nombre, mimeType: 'application/pdf', buffer: Buffer.from(bytes) };
}
