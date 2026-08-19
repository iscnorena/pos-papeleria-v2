'use client';

import { useEffect, useRef } from 'react';

import {
  ALTO_ENCABEZADO,
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
  areaDibujo,
  areaRayado,
  lineasEncabezado,
  posicionesCuadricula,
  posicionesDobleRaya,
  posicionesRaya,
  type HojaLibretaConfig,
} from './layout';

// Mismas constantes y funciones puras de layout.ts que usa pdf.ts (generarHojaLibreta) —
// sin recalcular nada aquí. El canvas usa Y hacia abajo desde arriba del contenido, que
// es justo la convención en la que ya está expresado layout.ts (sin el volteo que sí
// necesita pdf-lib). Todas las páginas del PDF son idénticas, así que a diferencia de
// VistaPreviaCanvas de rifas, esta no pagina: una sola vista basta.

function dibujarLineasHorizontales(
  ctx: CanvasRenderingContext2D,
  distancias: number[],
  colorHex: string,
) {
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  for (const d of distancias) {
    const y = MARGIN + d;
    ctx.moveTo(MARGIN, y);
    ctx.lineTo(PAGE_WIDTH - MARGIN, y);
  }
  ctx.stroke();
}

export function VistaPreviaCanvas({ config }: { config: HojaLibretaConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lineas = lineasEncabezado(config);

    if (lineas.length > 0) {
      let y = MARGIN;
      for (const linea of lineas) {
        y += linea.tamano * 0.9;
        ctx.font = `${linea.negrita ? 'bold' : ''} ${linea.tamano}px sans-serif`.trim();
        ctx.fillStyle = linea.negrita ? COLOR_TEXTO_ENCABEZADO : COLOR_TEXTO_SECUNDARIO;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(linea.texto, MARGIN, y);
        y += linea.tamano * 0.35;
      }
      ctx.strokeStyle = COLOR_LINEA;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(MARGIN, MARGIN + ALTO_ENCABEZADO);
      ctx.lineTo(PAGE_WIDTH - MARGIN, MARGIN + ALTO_ENCABEZADO);
      ctx.stroke();
    }

    const { y: yRayado, alto: altoRayado } = areaRayado(lineas);

    function dibujarMargenRojo(ctx: CanvasRenderingContext2D) {
      ctx.strokeStyle = COLOR_MARGEN_ROJO;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGEN_ROJO_X, MARGIN + yRayado);
      ctx.lineTo(MARGEN_ROJO_X, MARGIN + yRayado + altoRayado);
      ctx.stroke();
    }

    function dibujarCuadricula(ctx: CanvasRenderingContext2D, celdaMm: number) {
      const { horizontales, verticales } = posicionesCuadricula(altoRayado, CONTENT_WIDTH, celdaMm);
      ctx.strokeStyle = COLOR_CUADRICULA;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (const h of horizontales) {
        const y = MARGIN + yRayado + h;
        ctx.moveTo(MARGIN, y);
        ctx.lineTo(PAGE_WIDTH - MARGIN, y);
      }
      for (const v of verticales) {
        const x = MARGIN + v;
        ctx.moveTo(x, MARGIN + yRayado);
        ctx.lineTo(x, MARGIN + yRayado + altoRayado);
      }
      ctx.stroke();
    }

    switch (config.estilo) {
      case 'raya':
        dibujarLineasHorizontales(
          ctx,
          posicionesRaya(altoRayado).map((d) => yRayado + d),
          COLOR_LINEA,
        );
        dibujarMargenRojo(ctx);
        break;
      case 'doble-raya':
        dibujarLineasHorizontales(
          ctx,
          posicionesDobleRaya(altoRayado).flatMap((par) => [
            yRayado + par.superior,
            yRayado + par.inferior,
          ]),
          COLOR_LINEA,
        );
        dibujarMargenRojo(ctx);
        break;
      case 'cuadro-c7':
        dibujarCuadricula(ctx, TAMANO_CUADRO_C7_MM);
        break;
      case 'cuadro-aleman':
        dibujarCuadricula(ctx, TAMANO_CUADRO_ALEMAN_MM);
        break;
      case 'dibujo': {
        const { alturaCaja, lineasTexto } = areaDibujo(altoRayado);
        ctx.strokeStyle = COLOR_CAJA_DIBUJO;
        ctx.lineWidth = 1;
        ctx.strokeRect(MARGIN, MARGIN + yRayado, CONTENT_WIDTH, alturaCaja);
        dibujarLineasHorizontales(
          ctx,
          lineasTexto.map((d) => yRayado + d),
          COLOR_LINEA,
        );
        break;
      }
    }
  }, [config]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Vista previa de la hoja de libreta"
      className="w-full border border-linea-fuerte bg-white shadow-impresa"
    />
  );
}
