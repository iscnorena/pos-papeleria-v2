import { PDFDocument } from 'pdf-lib';

// Compartido por todas las herramientas de PDF (Unir, Dividir, las que sigan): leer un
// archivo del navegador, validar que sea un PDF de verdad y contar sus páginas. Nada de
// esto sube al servidor.

export type ArchivoPdf = {
  id: string;
  nombre: string;
  bytes: Uint8Array;
  /** Calculado al cargarlo, para mostrarlo en la lista antes de unir/dividir. */
  paginas: number;
};

let contador = 0;
const siguienteId = () => `pdf-${Date.now()}-${contador++}`;

/** Lee un archivo, valida que sea un PDF real (no solo la extensión) y cuenta sus
 * páginas. Lanza si el archivo está corrupto o no es un PDF — quien llama decide cómo
 * avisar. */
export async function cargarPdf(archivo: File): Promise<ArchivoPdf> {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const documento = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return { id: siguienteId(), nombre: archivo.name, bytes, paginas: documento.getPageCount() };
}
