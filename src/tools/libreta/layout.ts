// Motor puro de "Hoja de libreta": una sola fuente de verdad para el PDF (pdf.ts) y la
// vista previa en <canvas> (VistaPreviaCanvas.tsx) — mismo criterio que
// src/tools/rifas/layout.ts (ver ese archivo). Todas las posiciones se expresan como
// "distancia desde arriba del área de contenido", nunca en coordenadas de pdf-lib (que
// tiene el origen abajo-izquierda): pdf.ts hace el volteo, el <canvas> las usa tal cual.

export const PAGE_WIDTH = 612; // carta, en puntos PDF (72pt = 1")
export const PAGE_HEIGHT = 792;
export const MARGIN = 36;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
export const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN * 2;

/** Puntos por milímetro (72pt / 25.4mm) — todas las medidas de rayado se piensan en mm,
 * como en una papelería real, y se convierten aquí una sola vez. */
export const MM = 72 / 25.4;

export const ESPACIO_RAYA_MM = 8;
// El par va bien apretado (guía de altura de letra) y el salto entre un renglón y el
// siguiente es notoriamente más grande — si quedan parecidos, ya no se lee como "doble
// raya" sino como raya sencilla más densa (ajustado a ojo tras la primera prueba visual).
export const ESPACIO_DOBLE_RAYA_PAR_MM = 2;
export const ESPACIO_DOBLE_RAYA_RENGLON_MM = 12;
export const TAMANO_CUADRO_C7_MM = 7;
/** "Cuadro alemán" = cuadrícula C-14 (14mm), tamaño real de papelería — confirmado por
 * el usuario, no una estimación. */
export const TAMANO_CUADRO_ALEMAN_MM = 14;
/** Distancia del margen rojo, medida desde el borde IZQUIERDO DEL PAPEL (no desde
 * MARGIN) — así se mide en un cuaderno real. Cae dentro del área de contenido porque
 * MARGIN (36pt ≈ 12.7mm) es menor que esto. */
export const MARGEN_ROJO_DESDE_BORDE_MM = 28;
export const MARGEN_ROJO_X = MARGEN_ROJO_DESDE_BORDE_MM * MM;

/** Fracción del alto disponible que ocupa la caja en blanco del estilo "Dibujo"; el
 * resto lleva renglones (Raya) para un título/descripción. */
export const DIBUJO_FRACCION_CAJA = 0.65;

export const ESPACIO_TRAS_ENCABEZADO = 12;

export const COLOR_MARGEN_ROJO = '#BE3A2E'; // mismo tono "sello" del sistema
export const COLOR_LINEA = '#B9C2CE';
export const COLOR_CUADRICULA = '#C7CFE0';
export const COLOR_CAJA_DIBUJO = '#8A93A1';
export const COLOR_TEXTO_ENCABEZADO = '#17212F'; // "tinta" del sistema
export const COLOR_TEXTO_SECUNDARIO = '#5A6472'; // "grafito" del sistema

export type EstiloHoja = 'raya' | 'doble-raya' | 'cuadro-c7' | 'cuadro-aleman' | 'dibujo';

export const ESTILOS_HOJA: { valor: EstiloHoja; texto: string }[] = [
  { valor: 'raya', texto: 'Raya' },
  { valor: 'doble-raya', texto: 'Doble raya' },
  { valor: 'cuadro-c7', texto: 'Cuadro C-7' },
  { valor: 'cuadro-aleman', texto: 'Cuadro alemán' },
  { valor: 'dibujo', texto: 'Dibujo' },
];

export type PosicionTexto = 'izquierda' | 'centro' | 'derecha';

export const OPCIONES_POSICION_TEXTO: { valor: PosicionTexto; texto: string }[] = [
  { valor: 'izquierda', texto: 'Izquierda' },
  { valor: 'centro', texto: 'Centro' },
  { valor: 'derecha', texto: 'Derecha' },
];

export type HojaLibretaConfig = {
  nombre: string;
  nombrePosicion: PosicionTexto;
  materia: string;
  materiaPosicion: PosicionTexto;
  fecha: string;
  fechaPosicion: PosicionTexto;
  gradoGrupo: string;
  gradoGrupoPosicion: PosicionTexto;
  estilo: EstiloHoja;
  cantidad: number;
  numerarPaginas: boolean;
};

export type LineaEncabezado = {
  texto: string;
  tamano: number;
  negrita: boolean;
  posicion: PosicionTexto;
};

/** Alto de UN renglón del encabezado, según el tamaño de su texto — con aire suficiente
 * para que nunca se pise con el siguiente renglón. */
export function alturaRenglonEncabezado(tamano: number): number {
  return tamano * 1.6;
}

/**
 * Las líneas de texto del encabezado, en orden fijo (nombre, materia, fecha, grado y
 * grupo), ya con las reglas de omisión aplicadas: cada dato aparece solo si se llenó.
 * CADA dato va en su PROPIO renglón — es lo que garantiza que dos campos con
 * posiciones distintas (uno a la izquierda, otro a la derecha) nunca se encimen: nunca
 * comparten la misma altura de página, sin importar qué posición elija cada uno. Si no
 * se llenó ningún campo, no hay encabezado — la hoja sale lista para imprimir en
 * blanco. Fuente única para el PDF y la vista previa: ninguna de las dos rearma este
 * texto por su cuenta.
 */
export function lineasEncabezado(
  config: Pick<
    HojaLibretaConfig,
    | 'nombre'
    | 'nombrePosicion'
    | 'materia'
    | 'materiaPosicion'
    | 'fecha'
    | 'fechaPosicion'
    | 'gradoGrupo'
    | 'gradoGrupoPosicion'
  >,
): LineaEncabezado[] {
  const lineas: LineaEncabezado[] = [];
  const agregar = (texto: string, posicion: PosicionTexto, tamano: number, negrita: boolean) => {
    const limpio = texto.trim();
    if (limpio) lineas.push({ texto: limpio, tamano, negrita, posicion });
  };

  agregar(config.nombre, config.nombrePosicion, 15, true);
  agregar(config.materia, config.materiaPosicion, 10, false);
  agregar(config.fecha, config.fechaPosicion, 10, false);
  agregar(config.gradoGrupo, config.gradoGrupoPosicion, 10, false);

  return lineas;
}

/** 0 si no hay ninguna línea de encabezado (hoja en blanco); si no, la suma del alto de
 * cada renglón presente más un respiro final. */
export function alturaEncabezado(lineas: LineaEncabezado[]): number {
  if (lineas.length === 0) return 0;
  return (
    lineas.reduce((acc, linea) => acc + alturaRenglonEncabezado(linea.tamano), 0) +
    ESPACIO_TRAS_ENCABEZADO
  );
}

/** X para dibujar un texto de `anchoTexto` puntos según su `posicion` — mismo criterio
 * que `xParaPosicion` de src/tools/pdf/numerar.ts, centralizado aquí porque tanto
 * pdf.ts como VistaPreviaCanvas.tsx lo necesitan (a diferencia de numerar.ts, que solo
 * tiene un consumidor). */
export function xParaPosicion(posicion: PosicionTexto, anchoTexto: number): number {
  if (posicion === 'izquierda') return MARGIN;
  if (posicion === 'derecha') return PAGE_WIDTH - MARGIN - anchoTexto;
  return MARGIN + (CONTENT_WIDTH - anchoTexto) / 2; // centro
}

/** Dónde empieza el área rayada (distancia desde arriba del contenido) y cuánto alto
 * tiene disponible, según si hay encabezado o no. */
export function areaRayado(lineas: LineaEncabezado[]): { y: number; alto: number } {
  const alturaHeader = alturaEncabezado(lineas);
  const y = alturaHeader > 0 ? alturaHeader + ESPACIO_TRAS_ENCABEZADO : 0;
  return { y, alto: CONTENT_HEIGHT - y };
}

/** Posiciones (distancia desde arriba del área rayada) de cada línea horizontal de
 * "Raya", cada `espacioMm` — la primera línea queda un espacio abajo del borde
 * superior, no pegada a él. */
export function posicionesRaya(alto: number, espacioMm: number = ESPACIO_RAYA_MM): number[] {
  const espacio = espacioMm * MM;
  if (espacio <= 0) return [];
  const posiciones: number[] = [];
  for (let y = espacio; y <= alto; y += espacio) posiciones.push(y);
  return posiciones;
}

/** Cada renglón de "Doble raya" es un PAR de líneas cercanas; `superior`/`inferior` son
 * distancias desde arriba del área rayada, ambas dentro del mismo renglón. */
export function posicionesDobleRaya(alto: number): { superior: number; inferior: number }[] {
  const renglon = ESPACIO_DOBLE_RAYA_RENGLON_MM * MM;
  const par = ESPACIO_DOBLE_RAYA_PAR_MM * MM;
  const bandas: { superior: number; inferior: number }[] = [];
  for (let y = renglon; y <= alto; y += renglon) {
    bandas.push({ superior: y - par, inferior: y });
  }
  return bandas;
}

/** Líneas horizontales y verticales de la cuadrícula ("Cuadro C-7"/"Cuadro alemán"),
 * tilada desde la esquina superior izquierda del área rayada. */
export function posicionesCuadricula(
  alto: number,
  ancho: number,
  celdaMm: number,
): { horizontales: number[]; verticales: number[] } {
  const celda = celdaMm * MM;
  const horizontales: number[] = [];
  for (let y = 0; y <= alto; y += celda) horizontales.push(y);
  const verticales: number[] = [];
  for (let x = 0; x <= ancho; x += celda) verticales.push(x);
  return { horizontales, verticales };
}

/** "Dibujo": una caja en blanco arriba (`alturaCaja`) y renglones de Raya abajo
 * (`lineasTexto`, ya como distancia desde arriba del área rayada completa). */
export function areaDibujo(alto: number): { alturaCaja: number; lineasTexto: number[] } {
  const alturaCaja = alto * DIBUJO_FRACCION_CAJA;
  const restante = alto - alturaCaja - ESPACIO_TRAS_ENCABEZADO;
  const lineasTexto = posicionesRaya(restante).map((y) => alturaCaja + ESPACIO_TRAS_ENCABEZADO + y);
  return { alturaCaja, lineasTexto };
}

export type Rgb = { r: number; g: number; b: number };

/** Conversión hex → rgb normalizado [0,1], para pdf-lib y <canvas>. Copia deliberada de
 * la de src/tools/rifas/layout.ts (función genérica de ~10 líneas, sin nada específico
 * de rifas): evita que "Hoja de libreta" dependa de un módulo de otra herramienta. */
export function hexARgb(colorHex: string): Rgb {
  const limpio = colorHex.replace('#', '');
  const seis =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;
  const num = parseInt(seis, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/** Quita, sin tronar, cualquier carácter que la fuente embebida no pueda dibujar
 * (copia deliberada de la de rifas/layout.ts — misma razón que hexARgb). */
export function sanearTexto(texto: string, soportado: (codePoint: number) => boolean): string {
  return Array.from(texto)
    .filter((caracter) => soportado(caracter.codePointAt(0)!))
    .join('');
}
