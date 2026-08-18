// Motor puro de la hoja de control de rifa: una sola fuente de verdad para el PDF
// (pdf.ts) y la vista previa en <canvas> (VistaPreviaCanvas.tsx). Ninguna de las dos debe
// recalcular estos valores por su cuenta — si se duplicara el cálculo, la vista previa y
// el PDF podrían desincronizarse (mismo bug que ya se dio una vez: la UI decía "10
// boletos por página" mientras el generador real usaba 18).

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN = 36;
export const HEADER_HEIGHT = 90;
export const TABLE_HEADER_ROW = 32;
export const TABLE_W = PAGE_WIDTH - MARGIN * 2; // 540

/** Fracciones del ancho de tabla. Deben sumar 1. */
export const COL_NUMERO = 0.2; // "No. Boleto"
export const COL_NOMBRE = 0.45;
export const COL_CONTACTO = 0.35;

export const AVAILABLE_HEIGHT = PAGE_HEIGHT - MARGIN * 2 - HEADER_HEIGHT - 8 - TABLE_HEADER_ROW;

/**
 * Cuántos boletos van por hoja: la fila SIEMPRE se estira o encoge para llenar exacto
 * `AVAILABLE_HEIGHT` (ver `alturaFila`), así que estos son límites elegidos a mano, no
 * "cuántos caben" — el usuario decide dentro de este rango.
 * - Mínimo 18: para que la primera hoja siempre quede completamente cubierta (a menos
 *   boletos que eso, la fila se vería exageradamente alta).
 * - Máximo 35: más que eso, la fila queda demasiado angosta para leerse o escribir un
 *   nombre a mano.
 */
export const TICKETS_POR_PAGINA_MINIMO = 18;
export const TICKETS_POR_PAGINA_MAXIMO = 35;

export const COLOR_FILA_PAR = '#F8FAFC';
export const COLOR_BORDE = '#CBD5E1';
export const COLOR_FONDO_DEFECTO = '#17212F'; // "tinta" de la paleta del proyecto

export const ENCABEZADOS_TABLA = ['No. Boleto', 'Nombre', 'Contacto'] as const;

/** Tamaño máximo del logo y de la foto del premio dentro del header (mismo tope para
 * los dos: van en extremos opuestos, simétricos). */
export const ANCHO_MAX_IMAGEN_HEADER = 100;
export const ALTO_MAX_IMAGEN_HEADER = HEADER_HEIGHT - 12;
export const PADDING_HEADER = 16;
export const GAP_IMAGEN_TEXTO = 16;

export type RaffleConfig = {
  quantity: number;
  startNumber: number;
  /** Cuántos boletos van por hoja, entre TICKETS_POR_PAGINA_MINIMO y _MAXIMO. */
  ticketsPorPagina: number;
  eventName: string;
  prize: string;
  date: string;
  cost: string;
  organizer: string;
  phone: string;
  /** Data URL de la imagen ya normalizada a PNG/JPEG. Va en la esquina izquierda del header. */
  raffleImage?: string;
  /** Foto opcional del premio. Va en la esquina derecha del header, en el extremo opuesto al logo. */
  prizeImage?: string;
  backgroundColor?: string;
};

/** `ticketsPorPagina` acotado a [MINIMO, MAXIMO], por si llega vacío o fuera de rango. */
export function porPaginaValido(ticketsPorPagina: number): number {
  const valor = Number.isFinite(ticketsPorPagina)
    ? Math.round(ticketsPorPagina)
    : TICKETS_POR_PAGINA_MINIMO;
  return Math.min(TICKETS_POR_PAGINA_MAXIMO, Math.max(TICKETS_POR_PAGINA_MINIMO, valor));
}

/** Alto de cada fila para que, con `ticketsPorPagina` boletos, la tabla llene exacto
 * `AVAILABLE_HEIGHT` — ni se queda corta ni se desborda, sin importar cuántos se pidan. */
export function alturaFila(ticketsPorPagina: number): number {
  return AVAILABLE_HEIGHT / porPaginaValido(ticketsPorPagina);
}

export type Rgb = { r: number; g: number; b: number };

export function anchoNumero(config: Pick<RaffleConfig, 'quantity' | 'startNumber'>): number {
  const ultimo = config.startNumber + Math.max(1, config.quantity) - 1;
  return Math.max(3, String(Math.max(0, ultimo)).length);
}

export function formatearNumero(n: number, ancho: number): string {
  return String(n).padStart(ancho, '0');
}

export function totalPaginas(quantity: number, ticketsPorPagina: number): number {
  return Math.max(1, Math.ceil(Math.max(1, quantity) / porPaginaValido(ticketsPorPagina)));
}

/** Los números de UNA página (0-indexada), ya formateados. Simple `slice`: la tabla es de
 * una sola columna hacia abajo, no una cuadrícula 2D. */
export function numerosDePagina(config: RaffleConfig, pagina: number): string[] {
  const cantidad = Math.max(1, config.quantity);
  const porPagina = porPaginaValido(config.ticketsPorPagina);
  const ancho = anchoNumero(config);
  const inicio = config.startNumber + pagina * porPagina;
  const fin = Math.min(config.startNumber + cantidad, inicio + porPagina);

  const numeros: string[] = [];
  for (let n = inicio; n < fin; n++) numeros.push(formatearNumero(n, ancho));
  return numeros;
}

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

export function esFondoOscuro(colorHex: string): boolean {
  const { r, g, b } = hexARgb(colorHex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 0.5;
}

export function colorTextoPrincipal(colorHex: string): Rgb {
  return esFondoOscuro(colorHex) ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 };
}

/** Gris intermedio para subtítulos: más claro sobre fondo oscuro, más oscuro sobre fondo
 * claro. Valor de diseño (no viene de ninguna especificación), ajustable a ojo. */
export function colorTextoSecundario(colorHex: string): Rgb {
  return esFondoOscuro(colorHex) ? { r: 0.82, g: 0.85, b: 0.89 } : { r: 0.35, g: 0.39, b: 0.45 };
}

/** Escala `anchoOriginal`×`altoOriginal` para que quepa dentro de `anchoMax`×`altoMax`,
 * preservando la proporción — mismo cálculo para el logo y la foto del premio, en el PDF
 * y en el <canvas>. */
export function escalarDentroDe(
  anchoOriginal: number,
  altoOriginal: number,
  anchoMax: number,
  altoMax: number,
): { ancho: number; alto: number } {
  const escala = Math.min(anchoMax / anchoOriginal, altoMax / altoOriginal);
  return { ancho: anchoOriginal * escala, alto: altoOriginal * escala };
}

export type LineaHeader = { texto: string; tamano: number; negrita: boolean; secundario: boolean };

/**
 * Las líneas de texto del header, en orden, ya con las reglas de omisión aplicadas
 * ("Fecha: ... | Costo: ..." sin el "|" si falta uno de los dos, etc.). Fuente única para
 * el PDF y la vista previa: ninguna de las dos rearma este texto por su cuenta.
 */
export function lineasHeader(
  config: Pick<RaffleConfig, 'eventName' | 'prize' | 'date' | 'cost' | 'organizer' | 'phone'>,
): LineaHeader[] {
  const lineas: LineaHeader[] = [];

  if (config.eventName) {
    lineas.push({ texto: config.eventName, tamano: 18, negrita: true, secundario: false });
  }
  if (config.prize) {
    lineas.push({ texto: `Premio: ${config.prize}`, tamano: 11, negrita: false, secundario: true });
  }

  // El costo siempre lleva "$" al frente, lo haya tecleado el usuario o no (y sin
  // duplicarlo si sí lo tecleó).
  const costoConSigno = config.cost ? `$${config.cost.replace(/^\$+\s*/, '')}` : '';
  const fechaCosto =
    config.date && costoConSigno
      ? `Fecha: ${config.date}  |  Costo: ${costoConSigno}`
      : config.date
        ? `Fecha: ${config.date}`
        : costoConSigno
          ? `Costo: ${costoConSigno}`
          : '';
  if (fechaCosto) lineas.push({ texto: fechaCosto, tamano: 9, negrita: false, secundario: true });

  const contacto =
    config.organizer && config.phone
      ? `${config.organizer} - ${config.phone}`
      : config.organizer || config.phone;
  if (contacto) lineas.push({ texto: contacto, tamano: 9, negrita: false, secundario: true });

  return lineas;
}

/**
 * Quita, sin tronar, cualquier carácter que la fuente embebida no pueda dibujar (típicamente
 * emoji reales: pdf-lib no soporta fuentes a color, así que ni Noto Sans los va a pintar).
 * `soportado` normalmente es `(codePoint) => fuente.getCharacterSet().includes(codePoint)`,
 * pero se recibe como función para no acoplar este módulo puro a pdf-lib/fontkit.
 */
export function sanearTexto(texto: string, soportado: (codePoint: number) => boolean): string {
  return Array.from(texto)
    .filter((caracter) => soportado(caracter.codePointAt(0)!))
    .join('');
}
