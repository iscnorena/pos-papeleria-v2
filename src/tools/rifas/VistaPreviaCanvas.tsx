'use client';

import { useEffect, useRef } from 'react';

import {
  ALTO_MAX_IMAGEN_HEADER,
  ANCHO_MAX_IMAGEN_HEADER,
  COL_CONTACTO,
  COL_NOMBRE,
  COL_NUMERO,
  COLOR_BORDE,
  COLOR_FILA_PAR,
  COLOR_FONDO_DEFECTO,
  ENCABEZADOS_TABLA,
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
  lineasHeader,
  numerosDePagina,
  type RaffleConfig,
  type Rgb,
} from './layout';

// Mismas constantes y funciones puras de layout.ts que usa pdf.ts (generarPdfRifas) — sin
// recalcular nada aquí. El canvas usa Y hacia abajo desde arriba del área de contenido,
// que es justo la convención en la que ya está expresado layout.ts (no hace falta el
// volteo que sí necesita pdf-lib, cuyo origen está abajo-izquierda).

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

      let textoX = MARGIN + PADDING_HEADER;
      let textoAncho = TABLE_W - PADDING_HEADER * 2;

      if (logo) {
        const { ancho, alto } = escalarDentroDe(
          logo.width,
          logo.height,
          ANCHO_MAX_IMAGEN_HEADER,
          ALTO_MAX_IMAGEN_HEADER,
        );
        const y = MARGIN + (HEADER_HEIGHT - alto) / 2;
        ctx.drawImage(logo, MARGIN + PADDING_HEADER, y, ancho, alto);
        textoX += ancho + GAP_IMAGEN_TEXTO;
        textoAncho -= ancho + GAP_IMAGEN_TEXTO;
      }
      if (imagenPremio) {
        const { ancho, alto } = escalarDentroDe(
          imagenPremio.width,
          imagenPremio.height,
          ANCHO_MAX_IMAGEN_HEADER,
          ALTO_MAX_IMAGEN_HEADER,
        );
        const y = MARGIN + (HEADER_HEIGHT - alto) / 2;
        ctx.drawImage(imagenPremio, MARGIN + TABLE_W - PADDING_HEADER - ancho, y, ancho, alto);
        textoAncho -= ancho + GAP_IMAGEN_TEXTO;
      }

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
        ctx.fillText(linea.texto, textoX + Math.max(0, (textoAncho - anchoTexto) / 2), y);
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
      const filaAltura = alturaFila(config.ticketsPorPagina);
      const numeros = numerosDePagina(config, pagina);
      numeros.forEach((numero, indice) => {
        const yFila = yEncabezadoTabla + TABLE_HEADER_ROW + indice * filaAltura;
        if (indice % 2 === 0) {
          ctx.fillStyle = COLOR_FILA_PAR;
          ctx.fillRect(MARGIN, yFila, TABLE_W, filaAltura);
        }

        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(numero, colNumeroX + colNumeroW / 2, yFila + filaAltura / 2 + 4);

        ctx.strokeStyle = COLOR_BORDE;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(MARGIN, yFila + filaAltura);
        ctx.lineTo(MARGIN + TABLE_W, yFila + filaAltura);
        ctx.moveTo(colNombreX, yFila);
        ctx.lineTo(colNombreX, yFila + filaAltura);
        ctx.moveTo(colContactoX, yFila);
        ctx.lineTo(colContactoX, yFila + filaAltura);
        ctx.stroke();
      });
      ctx.textAlign = 'left';

      // --- Borde exterior de la tabla ---
      const altoTabla = TABLE_HEADER_ROW + numeros.length * filaAltura;
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
