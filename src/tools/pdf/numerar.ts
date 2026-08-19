import { PDFDocument, StandardFonts } from 'pdf-lib';

// Todo ocurre en el navegador con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto: el PDF del cliente nunca sube a ningún servidor.
//
// Solo dibuja dígitos, así que basta Helvetica estándar (viene incluida en pdf-lib, sin
// tener que ir a buscar Noto Sans como en Rifas): no hay acentos ni símbolos en juego.

const TAMANO = 10;
const MARGEN_INFERIOR = 24;
const MARGEN_LATERAL = 24;

export type PosicionNumero = 'izquierda' | 'centro' | 'derecha';

/** Número inicial válido: entero positivo. */
export function inicioValido(inicioEn: number): number {
  const entero = Math.round(inicioEn);
  return Number.isFinite(entero) && entero > 0 ? entero : 1;
}

function xParaPosicion(posicion: PosicionNumero, anchoPagina: number, anchoTexto: number): number {
  if (posicion === 'izquierda') return MARGEN_LATERAL;
  if (posicion === 'derecha') return anchoPagina - MARGEN_LATERAL - anchoTexto;
  return (anchoPagina - anchoTexto) / 2; // centro
}

/** Numera cada página, abajo, empezando en `inicioEn`. `posicion` es horizontal:
 * izquierda, centro (por defecto) o derecha. */
export async function numerarPdf(
  bytes: Uint8Array,
  inicioEn: number,
  posicion: PosicionNumero = 'centro',
): Promise<Uint8Array> {
  const documento = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const fuente = await documento.embedFont(StandardFonts.Helvetica);
  const inicio = inicioValido(inicioEn);

  documento.getPages().forEach((pagina, indice) => {
    const numero = String(inicio + indice);
    const anchoTexto = fuente.widthOfTextAtSize(numero, TAMANO);
    const { width } = pagina.getSize();
    pagina.drawText(numero, {
      x: xParaPosicion(posicion, width, anchoTexto),
      y: MARGEN_INFERIOR,
      size: TAMANO,
      font: fuente,
    });
  });

  return documento.save();
}
