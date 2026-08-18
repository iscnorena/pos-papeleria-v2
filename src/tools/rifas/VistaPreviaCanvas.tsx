'use client';

import { useEffect, useRef } from 'react';

import {
  COL_CONTACTO,
  COL_NOMBRE,
  COL_NUMERO,
  COLOR_BORDE,
  COLOR_FILA_PAR,
  COLOR_FONDO_DEFECTO,
  ENCABEZADOS_TABLA,
  HEADER_HEIGHT,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  ROW_HEIGHT,
  TABLE_HEADER_ROW,
  TABLE_W,
  colorTextoPrincipal,
  colorTextoSecundario,
  lineasHeader,
  numerosDePagina,
  type RaffleConfig,
  type Rgb,
} from './layout';

// Mismas constantes y funciones puras de layout.ts que usa pdf.ts (generarPdfRifas) — sin
// recalcular nada aquí. El canvas usa Y hacia abajo desde arriba del área de contenido,
// que es justo la convención en la que ya está expresado layout.ts (no hace falta el
// volteo que sí necesita pdf-lib, cuyo origen está abajo-izquierda).

const PADDING_HEADER = 16;
const GAP_LOGO_TEXTO = 16;
const GAP_PREMIO_TEXTO = 6;
const ALTO_MINIATURA_PREMIO = 16;

function rgbCss({ r, g, b }: Rgb): string {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

function cargarImagenSiHay(src: string | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function VistaPreviaCanvas({ config, pagina }: { config: RaffleConfig; pagina: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;

    function dibujar(logo: HTMLImageElement | null, imagenPremio: HTMLImageElement | null) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const colorFondo = config.backgroundColor || COLOR_FONDO_DEFECTO;
      const colorTexto = rgbCss(colorTextoPrincipal(colorFondo));
      const colorSub = rgbCss(colorTextoSecundario(colorFondo));

      // --- Header ---
      ctx.fillStyle = colorFondo;
      ctx.fillRect(MARGIN, MARGIN, TABLE_W, HEADER_HEIGHT);

      let textoX = MARGIN;
      let textoAncho = TABLE_W;

      if (logo) {
        const altoMax = HEADER_HEIGHT - 12;
        const anchoMax = 100;
        const escala = Math.min(anchoMax / logo.width, altoMax / logo.height);
        const ancho = logo.width * escala;
        const alto = logo.height * escala;
        const y = MARGIN + (HEADER_HEIGHT - alto) / 2;
        ctx.drawImage(logo, MARGIN + PADDING_HEADER, y, ancho, alto);
        textoX = MARGIN + PADDING_HEADER + ancho + GAP_LOGO_TEXTO;
        textoAncho = TABLE_W - PADDING_HEADER * 2 - ancho - GAP_LOGO_TEXTO;
      }

      const escalaPremio = imagenPremio
        ? Math.min(
            ALTO_MINIATURA_PREMIO / imagenPremio.width,
            ALTO_MINIATURA_PREMIO / imagenPremio.height,
          )
        : 0;
      const anchoPremio = imagenPremio ? imagenPremio.width * escalaPremio : 0;
      const altoPremio = imagenPremio ? imagenPremio.height * escalaPremio : 0;

      const lineas = lineasHeader(config);
      const alturaBloque = lineas.reduce((acc, l) => acc + l.tamano * 1.3, 0);
      let y = MARGIN + HEADER_HEIGHT / 2 - alturaBloque / 2;
      for (const linea of lineas) {
        let tamano = linea.tamano;
        ctx.font = `${linea.negrita ? 'bold' : ''} ${tamano}px sans-serif`.trim();
        if (linea.negrita) {
          while (tamano > 8 && ctx.measureText(linea.texto).width > textoAncho) {
            tamano -= 1;
            ctx.font = `bold ${tamano}px sans-serif`;
          }
        }
        y += tamano * 1.1;
        ctx.fillStyle = linea.secundario ? colorSub : colorTexto;
        ctx.textBaseline = 'alphabetic';
        const anchoTexto = ctx.measureText(linea.texto).width;

        if (linea.esPremio && imagenPremio) {
          // Miniatura del premio + texto, como un solo bloque centrado (mismo criterio que pdf.ts).
          const anchoBloque = anchoPremio + GAP_PREMIO_TEXTO + anchoTexto;
          const xBloque = textoX + Math.max(0, (textoAncho - anchoBloque) / 2);
          // Ajuste visual, no una fórmula exacta: centra la miniatura con la línea de texto.
          const yImagen = y - tamano - (altoPremio - tamano) / 2;
          ctx.drawImage(imagenPremio, xBloque, yImagen, anchoPremio, altoPremio);
          ctx.fillText(linea.texto, xBloque + anchoPremio + GAP_PREMIO_TEXTO, y);
        } else {
          ctx.fillText(linea.texto, textoX + Math.max(0, (textoAncho - anchoTexto) / 2), y);
        }
        y += linea.tamano * 0.2;
      }

      // --- Fila de encabezado de tabla ---
      const yEncabezadoTabla = MARGIN + HEADER_HEIGHT + 8;
      ctx.fillStyle = colorFondo;
      ctx.fillRect(MARGIN, yEncabezadoTabla, TABLE_W, TABLE_HEADER_ROW);

      const colNumeroX = MARGIN;
      const colNumeroW = TABLE_W * COL_NUMERO;
      const colNombreX = colNumeroX + colNumeroW;
      const colNombreW = TABLE_W * COL_NOMBRE;
      const colContactoX = colNombreX + colNombreW;
      const colContactoW = TABLE_W * COL_CONTACTO;

      ctx.fillStyle = colorTexto;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        ENCABEZADOS_TABLA[0],
        colNumeroX + colNumeroW / 2,
        yEncabezadoTabla + TABLE_HEADER_ROW / 2 + 3,
      );
      ctx.fillText(
        ENCABEZADOS_TABLA[1],
        colNombreX + colNombreW / 2,
        yEncabezadoTabla + TABLE_HEADER_ROW / 2 + 3,
      );
      ctx.fillText(
        ENCABEZADOS_TABLA[2],
        colContactoX + colContactoW / 2,
        yEncabezadoTabla + TABLE_HEADER_ROW / 2 + 3,
      );

      // --- Filas de boletos ---
      const numeros = numerosDePagina(config, pagina);
      numeros.forEach((numero, indice) => {
        const yFila = yEncabezadoTabla + TABLE_HEADER_ROW + indice * ROW_HEIGHT;
        if (indice % 2 === 0) {
          ctx.fillStyle = COLOR_FILA_PAR;
          ctx.fillRect(MARGIN, yFila, TABLE_W, ROW_HEIGHT);
        }

        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(numero, colNumeroX + colNumeroW / 2, yFila + ROW_HEIGHT / 2 + 4);

        ctx.strokeStyle = COLOR_BORDE;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(MARGIN, yFila + ROW_HEIGHT);
        ctx.lineTo(MARGIN + TABLE_W, yFila + ROW_HEIGHT);
        ctx.moveTo(colNombreX, yFila);
        ctx.lineTo(colNombreX, yFila + ROW_HEIGHT);
        ctx.moveTo(colContactoX, yFila);
        ctx.lineTo(colContactoX, yFila + ROW_HEIGHT);
        ctx.stroke();
      });
      ctx.textAlign = 'left';

      // --- Borde exterior de la tabla ---
      const altoTabla = TABLE_HEADER_ROW + numeros.length * ROW_HEIGHT;
      ctx.strokeStyle = colorFondo;
      ctx.lineWidth = 1;
      ctx.strokeRect(MARGIN, yEncabezadoTabla, TABLE_W, altoTabla);
    }

    void Promise.all([
      cargarImagenSiHay(config.raffleImage),
      cargarImagenSiHay(config.prizeImage),
    ]).then(([logo, imagenPremio]) => dibujar(logo, imagenPremio));
  }, [config, pagina]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Vista previa de la hoja de rifa"
      className="w-full border border-linea-fuerte bg-white shadow-impresa"
    />
  );
}
