import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';

import { t, type Idioma } from '@/lib/i18n/nucleo';
import {
  ALTO_MAX_IMAGEN_HEADER,
  ANCHO_MAX_IMAGEN_HEADER,
  COL_CONTACTO,
  COL_NOMBRE,
  COL_NUMERO,
  COLOR_BORDE,
  COLOR_FILA_PAR,
  COLOR_FONDO_DEFECTO,
  encabezadosTabla,
  GAP_IMAGEN_TEXTO,
  HEADER_HEIGHT,
  MARGIN,
  PADDING_HEADER,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TABLE_HEADER_ROW,
  TABLE_W,
  alturaFila,
  colorTextoPrincipal,
  colorTextoSecundario,
  escalarDentroDe,
  hexARgb,
  lineasHeader,
  numerosDePagina,
  sanearTexto,
  totalPaginas,
  type RaffleConfig,
  type Rgb,
} from './layout';

// El PDF se arma EN EL NAVEGADOR con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto. Nada sube al servidor.
//
// pdf-lib (con o sin fontkit) solo dibuja glifos de CONTORNO de una fuente, nunca fuentes
// a color (así están hechos los emoji reales). Embeber Noto Sans mejora mucho la
// cobertura frente a Helvetica/WinAnsi (acentos, símbolos latinos), pero NO pinta emoji a
// color — por eso cualquier texto se sanea contra el repertorio real de la fuente antes de
// dibujarse: nunca se deja que la excepción de codificación tumbe la generación.

type ImagenEscalada = {
  imagen: Awaited<ReturnType<PDFDocument['embedPng']>>;
  ancho: number;
  alto: number;
};

async function cargarImagenEscalada(
  documento: PDFDocument,
  dataUrl: string,
): Promise<ImagenEscalada> {
  const { bytes, esPng } = decodeDataUrl(dataUrl);
  const imagen = esPng ? await documento.embedPng(bytes) : await documento.embedJpg(bytes);
  const { ancho, alto } = escalarDentroDe(
    imagen.width,
    imagen.height,
    ANCHO_MAX_IMAGEN_HEADER,
    ALTO_MAX_IMAGEN_HEADER,
  );
  return { imagen, ancho, alto };
}

function color(c: Rgb) {
  return rgb(c.r, c.g, c.b);
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; esPng: boolean } {
  const [encabezado = '', base64 = ''] = dataUrl.split(',');
  const esPng = encabezado.includes('image/png');
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return { bytes, esPng };
}

async function cargarFuentes(documento: PDFDocument) {
  documento.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    fetch('/fonts/NotoSans-Regular.ttf').then((r) => r.arrayBuffer()),
    fetch('/fonts/NotoSans-Bold.ttf').then((r) => r.arrayBuffer()),
  ]);
  const regular = await documento.embedFont(regularBytes);
  const bold = await documento.embedFont(boldBytes);
  return { regular, bold };
}

/** Sanea un texto contra los glifos reales de `fuente`, y avisa (una vez por campo) si se
 * le quitó algo, para que la UI pueda decir cuál campo tenía el carácter problemático. */
function sanearCampo(
  campo: string,
  texto: string,
  fuente: PDFFont,
  camposModificados: Set<string>,
): string {
  const glifos = fuente.getCharacterSet();
  const soportado = (codePoint: number) => glifos.includes(codePoint);
  const limpio = sanearTexto(texto, soportado);
  if (limpio !== texto) camposModificados.add(campo);
  return limpio;
}

/** Centra `texto` horizontalmente en una franja de ancho `anchoDisponible`, encogiendo el
 * tamaño de fuente si no cabe (nombres de evento largos). Devuelve el tamaño final usado. */
function anchoAjustado(
  fuente: PDFFont,
  texto: string,
  anchoDisponible: number,
  tamanoInicial: number,
) {
  let tamano = tamanoInicial;
  while (tamano > 8 && fuente.widthOfTextAtSize(texto, tamano) > anchoDisponible) tamano -= 1;
  return tamano;
}

function centrarX(fuente: PDFFont, texto: string, tamano: number, x: number, ancho: number) {
  const anchoTexto = fuente.widthOfTextAtSize(texto, tamano);
  return x + Math.max(0, (ancho - anchoTexto) / 2);
}

/** Ajuste visual, no una fórmula exacta: acerca la línea base al centro óptico de la fila. */
function centrarY(yInferior: number, alto: number, tamano: number) {
  return yInferior + (alto - tamano * 0.7) / 2;
}

export type ResultadoPdfRifas = {
  bytes: Uint8Array;
  /** Nombres de campo (en español, listos para mostrar) a los que se les quitó algún
   * carácter no soportado, para que la UI pueda avisar sin ser genérica. */
  camposSaneados: string[];
};

export async function generarPdfRifas(
  config: RaffleConfig,
  idioma: Idioma,
  onProgress?: (actual: number, total: number) => void,
): Promise<ResultadoPdfRifas> {
  const documento = await PDFDocument.create();
  const { regular, bold } = await cargarFuentes(documento);

  const camposModificados = new Set<string>();
  const sanear = (campo: string, texto: string, fuente: PDFFont) =>
    sanearCampo(campo, texto, fuente, camposModificados);

  const eventName = sanear(t(idioma, 'rifas.nombreDelEvento'), config.eventName, bold);
  const prize = sanear(t(idioma, 'rifas.premio'), config.prize, regular);
  const date = sanear(t(idioma, 'comun.fecha'), config.date, regular);
  const cost = sanear(t(idioma, 'rifas.costo'), config.cost, regular);
  const organizer = sanear(t(idioma, 'rifas.organizador'), config.organizer, regular);
  const phone = sanear(t(idioma, 'admin.telefono'), config.phone, regular);

  const colorFondo = config.backgroundColor || COLOR_FONDO_DEFECTO;
  const colorTexto = color(colorTextoPrincipal(colorFondo));
  const colorSubtitulo = color(colorTextoSecundario(colorFondo));
  const colorHeader = color(hexARgb(colorFondo));
  const colorFilaPar = color(hexARgb(COLOR_FILA_PAR));
  const colorBorde = color(hexARgb(COLOR_BORDE));

  // Logo a la izquierda, foto del premio en el extremo opuesto (derecha) — mismo tamaño
  // máximo para los dos, composición simétrica.
  const logo = config.raffleImage
    ? await cargarImagenEscalada(documento, config.raffleImage)
    : null;
  const imagenPremio = config.prizeImage
    ? await cargarImagenEscalada(documento, config.prizeImage)
    : null;

  const colNumeroX = MARGIN;
  const colNumeroW = TABLE_W * COL_NUMERO;
  const colNombreX = colNumeroX + colNumeroW;
  const colNombreW = TABLE_W * COL_NOMBRE;
  const colContactoX = colNombreX + colNombreW;
  const colContactoW = TABLE_W * COL_CONTACTO;

  const filaAltura = alturaFila(config.ticketsPorPagina);

  /** Convierte "distancia desde arriba del área de contenido" a la Y (borde inferior) que
   * pide pdf-lib para dibujar un bloque de alto `alto` ahí. */
  const yDesdeArriba = (distancia: number, alto: number) => PAGE_HEIGHT - MARGIN - distancia - alto;

  const numeroDePaginas = totalPaginas(config.quantity, config.ticketsPorPagina);

  for (let pagina = 0; pagina < numeroDePaginas; pagina++) {
    const pdfPagina = documento.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // --- Header ---
    const yHeader = yDesdeArriba(0, HEADER_HEIGHT);
    pdfPagina.drawRectangle({
      x: MARGIN,
      y: yHeader,
      width: TABLE_W,
      height: HEADER_HEIGHT,
      color: colorHeader,
    });

    let textoX = MARGIN + PADDING_HEADER;
    let textoAncho = TABLE_W - PADDING_HEADER * 2;
    if (logo) {
      const logoY = yHeader + (HEADER_HEIGHT - logo.alto) / 2;
      pdfPagina.drawImage(logo.imagen, {
        x: MARGIN + PADDING_HEADER,
        y: logoY,
        width: logo.ancho,
        height: logo.alto,
      });
      textoX += logo.ancho + GAP_IMAGEN_TEXTO;
      textoAncho -= logo.ancho + GAP_IMAGEN_TEXTO;
    }
    if (imagenPremio) {
      const premioY = yHeader + (HEADER_HEIGHT - imagenPremio.alto) / 2;
      pdfPagina.drawImage(imagenPremio.imagen, {
        x: MARGIN + TABLE_W - PADDING_HEADER - imagenPremio.ancho,
        y: premioY,
        width: imagenPremio.ancho,
        height: imagenPremio.alto,
      });
      textoAncho -= imagenPremio.ancho + GAP_IMAGEN_TEXTO;
    }

    const lineas = lineasHeader({ eventName, prize, date, cost, organizer, phone }, idioma);

    const alturaBloque = lineas.reduce((acc, l) => acc + l.tamano * 1.3, 0);
    let yLinea = yHeader + HEADER_HEIGHT / 2 + alturaBloque / 2;
    for (const linea of lineas) {
      const fuente = linea.negrita ? bold : regular;
      const tamano = linea.negrita
        ? anchoAjustado(fuente, linea.texto, textoAncho, linea.tamano)
        : linea.tamano;
      yLinea -= tamano * 1.1;
      pdfPagina.drawText(linea.texto, {
        x: centrarX(fuente, linea.texto, tamano, textoX, textoAncho),
        y: yLinea,
        size: tamano,
        font: fuente,
        color: linea.secundario ? colorSubtitulo : colorTexto,
      });
      yLinea -= linea.tamano * 0.2;
    }

    // --- Fila de encabezado de la tabla ---
    const yEncabezadoTabla = yDesdeArriba(HEADER_HEIGHT + 8, TABLE_HEADER_ROW);
    pdfPagina.drawRectangle({
      x: MARGIN,
      y: yEncabezadoTabla,
      width: TABLE_W,
      height: TABLE_HEADER_ROW,
      color: colorHeader,
    });
    const [textoColNumero, textoColNombre, textoColContacto] = encabezadosTabla(idioma);
    const columnas = [
      { x: colNumeroX, ancho: colNumeroW, texto: textoColNumero },
      { x: colNombreX, ancho: colNombreW, texto: textoColNombre },
      { x: colContactoX, ancho: colContactoW, texto: textoColContacto },
    ];
    for (const col of columnas) {
      pdfPagina.drawText(col.texto, {
        x: centrarX(bold, col.texto, 10, col.x, col.ancho),
        y: centrarY(yEncabezadoTabla, TABLE_HEADER_ROW, 10),
        size: 10,
        font: bold,
        color: colorTexto,
      });
    }

    // --- Filas de boletos ---
    const numeros = numerosDePagina(config, pagina);
    numeros.forEach((numero, indice) => {
      const yFila = yDesdeArriba(
        HEADER_HEIGHT + 8 + TABLE_HEADER_ROW + indice * filaAltura,
        filaAltura,
      );
      if (indice % 2 === 0) {
        pdfPagina.drawRectangle({
          x: MARGIN,
          y: yFila,
          width: TABLE_W,
          height: filaAltura,
          color: colorFilaPar,
        });
      }
      pdfPagina.drawText(numero, {
        x: centrarX(bold, numero, 11, colNumeroX, colNumeroW),
        y: centrarY(yFila, filaAltura, 11),
        size: 11,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
      });

      pdfPagina.drawLine({
        start: { x: MARGIN, y: yFila },
        end: { x: MARGIN + TABLE_W, y: yFila },
        thickness: 0.5,
        color: colorBorde,
      });
      pdfPagina.drawLine({
        start: { x: colNombreX, y: yFila },
        end: { x: colNombreX, y: yFila + filaAltura },
        thickness: 0.5,
        color: colorBorde,
      });
      pdfPagina.drawLine({
        start: { x: colContactoX, y: yFila },
        end: { x: colContactoX, y: yFila + filaAltura },
        thickness: 0.5,
        color: colorBorde,
      });
    });

    // --- Borde exterior de toda la tabla ---
    const altoTabla = TABLE_HEADER_ROW + numeros.length * filaAltura;
    pdfPagina.drawRectangle({
      x: MARGIN,
      y: yEncabezadoTabla - (altoTabla - TABLE_HEADER_ROW),
      width: TABLE_W,
      height: altoTabla,
      borderColor: colorHeader,
      borderWidth: 1,
    });

    onProgress?.(pagina + 1, numeroDePaginas);
  }

  return { bytes: await documento.save(), camposSaneados: [...camposModificados] };
}
