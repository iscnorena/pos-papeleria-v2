import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { numerarPdf } from '@/tools/pdf/numerar';
import {
  CONTENT_WIDTH,
  COLOR_CAJA_DIBUJO,
  COLOR_CUADRICULA,
  COLOR_LINEA,
  COLOR_MARGEN_ROJO,
  COLOR_TEXTO_ENCABEZADO,
  COLOR_TEXTO_SECUNDARIO,
  MARGEN_ROJO_X,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TAMANO_CUADRO_ALEMAN_MM,
  TAMANO_CUADRO_C7_MM,
  alturaEncabezado,
  alturaRenglonEncabezado,
  areaDibujo,
  areaRayado,
  hexARgb,
  lineasEncabezado,
  posicionesCuadricula,
  posicionesDobleRaya,
  posicionesRaya,
  sanearTexto,
  xParaPosicion,
  type EstiloHoja,
  type HojaLibretaConfig,
  type Rgb,
} from './layout';

// El PDF se arma EN EL NAVEGADOR con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto (ver src/tools/rifas/pdf.ts, mismo patrón). Nada sube al servidor.

async function cargarFuentes(documento: PDFDocument) {
  documento.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    fetch('/fonts/NotoSans-Regular.ttf').then((r) => r.arrayBuffer()),
    fetch('/fonts/NotoSans-Bold.ttf').then((r) => r.arrayBuffer()),
  ]);
  return {
    regular: await documento.embedFont(regularBytes),
    bold: await documento.embedFont(boldBytes),
  };
}

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

function color(c: Rgb | string) {
  const rgbValor = typeof c === 'string' ? hexARgb(c) : c;
  return rgb(rgbValor.r, rgbValor.g, rgbValor.b);
}

function dibujarLineasHorizontales(
  pagina: PDFPage,
  distancias: number[],
  y: (distancia: number) => number,
  colorHex: string,
) {
  for (const d of distancias) {
    pagina.drawLine({
      start: { x: MARGIN, y: y(d) },
      end: { x: PAGE_WIDTH - MARGIN, y: y(d) },
      thickness: 0.5,
      color: color(colorHex),
    });
  }
}

function dibujarMargenRojo(
  pagina: PDFPage,
  yInicio: number,
  alto: number,
  y: (distancia: number) => number,
) {
  pagina.drawLine({
    start: { x: MARGEN_ROJO_X, y: y(yInicio) },
    end: { x: MARGEN_ROJO_X, y: y(yInicio + alto) },
    thickness: 0.75,
    color: color(COLOR_MARGEN_ROJO),
  });
}

function dibujarCuadricula(
  pagina: PDFPage,
  yInicio: number,
  alto: number,
  celdaMm: number,
  y: (distancia: number) => number,
) {
  const { horizontales, verticales } = posicionesCuadricula(alto, CONTENT_WIDTH, celdaMm);
  for (const h of horizontales) {
    pagina.drawLine({
      start: { x: MARGIN, y: y(yInicio + h) },
      end: { x: PAGE_WIDTH - MARGIN, y: y(yInicio + h) },
      thickness: 0.5,
      color: color(COLOR_CUADRICULA),
    });
  }
  for (const v of verticales) {
    pagina.drawLine({
      start: { x: MARGIN + v, y: y(yInicio) },
      end: { x: MARGIN + v, y: y(yInicio + alto) },
      thickness: 0.5,
      color: color(COLOR_CUADRICULA),
    });
  }
}

function dibujarRayado(
  pagina: PDFPage,
  estilo: EstiloHoja,
  yInicio: number,
  alto: number,
  y: (distancia: number, bloque?: number) => number,
) {
  switch (estilo) {
    case 'raya':
      dibujarLineasHorizontales(
        pagina,
        posicionesRaya(alto).map((d) => yInicio + d),
        y,
        COLOR_LINEA,
      );
      dibujarMargenRojo(pagina, yInicio, alto, y);
      break;
    case 'doble-raya':
      for (const par of posicionesDobleRaya(alto)) {
        dibujarLineasHorizontales(
          pagina,
          [yInicio + par.superior, yInicio + par.inferior],
          y,
          COLOR_LINEA,
        );
      }
      dibujarMargenRojo(pagina, yInicio, alto, y);
      break;
    case 'cuadro-c7':
      dibujarCuadricula(pagina, yInicio, alto, TAMANO_CUADRO_C7_MM, y);
      break;
    case 'cuadro-aleman':
      dibujarCuadricula(pagina, yInicio, alto, TAMANO_CUADRO_ALEMAN_MM, y);
      break;
    case 'dibujo': {
      const { alturaCaja, lineasTexto } = areaDibujo(alto);
      pagina.drawRectangle({
        x: MARGIN,
        y: y(yInicio, alturaCaja),
        width: CONTENT_WIDTH,
        height: alturaCaja,
        borderColor: color(COLOR_CAJA_DIBUJO),
        borderWidth: 1,
      });
      dibujarLineasHorizontales(
        pagina,
        lineasTexto.map((d) => yInicio + d),
        y,
        COLOR_LINEA,
      );
      break;
    }
  }
}

export type ResultadoHojaLibreta = {
  bytes: Uint8Array;
  /** Nombres de campo a los que se les quitó algún carácter no soportado (típicamente
   * emoji), para que la UI pueda avisar sin ser genérica. */
  camposSaneados: string[];
};

export async function generarHojaLibreta(
  config: HojaLibretaConfig,
  onProgress?: (actual: number, total: number) => void,
): Promise<ResultadoHojaLibreta> {
  const documento = await PDFDocument.create();
  const { regular, bold } = await cargarFuentes(documento);

  const camposModificados = new Set<string>();
  const sanear = (campo: string, texto: string, fuente: PDFFont) =>
    sanearCampo(campo, texto, fuente, camposModificados);

  const nombre = sanear('Nombre del alumno', config.nombre, bold);
  const maestro = sanear('Nombre del maestro', config.maestro, regular);
  const materia = sanear('Materia', config.materia, regular);
  const fecha = sanear('Fecha', config.fecha, regular);
  const gradoGrupo = sanear('Grado y grupo', config.gradoGrupo, regular);

  const lineas = lineasEncabezado({
    nombre,
    nombrePosicion: config.nombrePosicion,
    maestro,
    maestroPosicion: config.maestroPosicion,
    materia,
    materiaPosicion: config.materiaPosicion,
    fecha,
    fechaPosicion: config.fechaPosicion,
    gradoGrupo,
    gradoGrupoPosicion: config.gradoGrupoPosicion,
  });
  const { y: yRayado, alto: altoRayado } = areaRayado(lineas);

  /** "distancia desde arriba del contenido" (+ alto opcional, para el borde inferior de
   * un bloque) → Y de pdf-lib (origen abajo-izquierda). Mismo helper que rifas/pdf.ts. */
  const y = (distancia: number, alto = 0) => PAGE_HEIGHT - MARGIN - distancia - alto;

  const total = Math.max(1, Math.round(config.cantidad));

  for (let i = 0; i < total; i++) {
    const pagina = documento.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    if (lineas.length > 0) {
      let distancia = 0;
      for (const linea of lineas) {
        distancia += alturaRenglonEncabezado(linea.tamano);
        const fuente = linea.negrita ? bold : regular;
        const anchoTexto = fuente.widthOfTextAtSize(linea.texto, linea.tamano);
        // La línea base queda cerca del borde inferior de su propio renglón, nunca del
        // siguiente: cada campo tiene su franja de alto fijo, así que un campo a la
        // izquierda y otro a la derecha jamás comparten la misma altura de página.
        pagina.drawText(linea.texto, {
          x: xParaPosicion(linea.posicion, anchoTexto),
          y: y(distancia - linea.tamano * 0.25),
          size: linea.tamano,
          font: fuente,
          color: color(linea.negrita ? COLOR_TEXTO_ENCABEZADO : COLOR_TEXTO_SECUNDARIO),
        });
      }
      const alturaHeader = alturaEncabezado(lineas);
      pagina.drawLine({
        start: { x: MARGIN, y: y(alturaHeader) },
        end: { x: PAGE_WIDTH - MARGIN, y: y(alturaHeader) },
        thickness: 0.75,
        color: color(COLOR_LINEA),
      });
    }

    dibujarRayado(pagina, config.estilo, yRayado, altoRayado, y);

    onProgress?.(i + 1, total);
  }

  let bytes = await documento.save();
  if (config.numerarPaginas && total > 1) {
    bytes = await numerarPdf(bytes, 1, 'centro');
  }

  return { bytes, camposSaneados: [...camposModificados] };
}
