import { PDFDocument } from 'pdf-lib';

// Todo ocurre en el navegador con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto: los PDF del cliente nunca suben a ningún servidor.

export type ArchivoPdf = {
  id: string;
  nombre: string;
  bytes: Uint8Array;
  /** Calculado al cargarlo, para mostrarlo en la lista antes de unir. */
  paginas: number;
};

let contador = 0;
const siguienteId = () => `pdf-${Date.now()}-${contador++}`;

/** Lee un archivo, valida que sea un PDF real (no solo la extensión) y cuenta sus
 * páginas. Lanza si el archivo está corrupto o no es un PDF — quien llama decide cómo
 * avisar (ver `manejarArchivos` en `UnirPdf.tsx`). */
export async function cargarPdf(archivo: File): Promise<ArchivoPdf> {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const documento = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return { id: siguienteId(), nombre: archivo.name, bytes, paginas: documento.getPageCount() };
}

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
