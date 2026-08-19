import { PDFDocument, StandardFonts } from 'pdf-lib';

// Todo ocurre en el navegador con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto: el PDF del cliente nunca sube a ningún servidor.
//
// Solo dibuja dígitos, así que basta Helvetica estándar (viene incluida en pdf-lib, sin
// tener que ir a buscar Noto Sans como en Rifas): no hay acentos ni símbolos en juego.

const TAMANO = 10;
const MARGEN_INFERIOR = 24;

/** Número inicial válido: entero positivo. */
export function inicioValido(inicioEn: number): number {
  const entero = Math.round(inicioEn);
  return Number.isFinite(entero) && entero > 0 ? entero : 1;
}

/** Numera cada página, centrado abajo, empezando en `inicioEn`. */
export async function numerarPdf(bytes: Uint8Array, inicioEn: number): Promise<Uint8Array> {
  const documento = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const fuente = await documento.embedFont(StandardFonts.Helvetica);
  const inicio = inicioValido(inicioEn);

  documento.getPages().forEach((pagina, indice) => {
    const numero = String(inicio + indice);
    const anchoTexto = fuente.widthOfTextAtSize(numero, TAMANO);
    const { width } = pagina.getSize();
    pagina.drawText(numero, {
      x: (width - anchoTexto) / 2,
      y: MARGEN_INFERIOR,
      size: TAMANO,
      font: fuente,
    });
  });

  return documento.save();
}
