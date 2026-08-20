// §7.1 — configuración del negocio en un módulo, no en una tabla.
//
// Los nombres de los métodos de pago se leen SIEMPRE de aquí. En la versión Laravel esto se
// repetía con `ucfirst()` en cinco vistas y dejaba «Cash» y «Transfer» a la vista del cliente.

export const POS = {
  nombreNegocio: process.env.POS_COMPANY_NAME ?? 'Mi Negocio',
  prefijoTicket: 'BR',
  tasaImpuesto: 0, // 0.16 para IVA 16%
  simboloMoneda: '$',
  codigoMoneda: 'MXN',
  pieTicket: '¡Gracias por su compra!',
  anchoTicketMm: 80,
  metodosPago: { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' },
  // Tope contra errores de dedo al teclear un precio abierto (ej. 3000 en vez de 30.00),
  // no un límite de negocio. Ajustable a mano si hace falta.
  precioAbiertoMaximo: 200000, // $2,000.00
} as const;

export const RIFAS = {
  // Tope contra que el navegador se congele armando un PDF gigantesco, no un límite de negocio.
  cantidadMaxima: 5000,
} as const;

export const PDF = {
  // Tope contra que el navegador se congele leyendo/uniendo demasiados PDF de golpe.
  unirArchivosMaximo: 20,
  // Tope contra que el navegador se congele armando demasiadas partes de golpe (ej. un
  // PDF de 500 páginas dividido "una por archivo" dispararía 500 descargas).
  dividirPartesMaximo: 40,
} as const;

export const LIBRETA = {
  // Tope contra que el navegador se congele armando demasiadas hojas repetidas de golpe.
  hojasMaximo: 300,
} as const;

export type ReglaCostoConsolidado = 'ultima_compra' | 'proveedor_preferido';

export const RECEPCION = {
  // Tolerancia entre la suma de líneas+impuestos y el Total del comprobante antes de
  // bloquear el botón de autorizar (redondeo de centavos entre conceptos, no un margen de
  // negocio).
  toleranciaCuadreCentavos: 100, // $1.00
  // A partir de qué variación (fracción) entre el costo nuevo y el último costo del MISMO
  // proveedor se muestra una advertencia. No bloquea autorizar.
  alertaVariacionCostoFraccion: 0.15, // 15%
  // Regla de `calcularCostoConsolidado` (src/lib/costeo.ts): qué costo por proveedor se
  // refleja en `products.costPrice`, el único que usa el resto del sistema.
  reglaCostoConsolidado: 'ultima_compra' as ReglaCostoConsolidado,
} as const;

export const PAGINACION = {
  // Filas por página en los listados administrativos (productos, inventario, historial…).
  // Un solo número para todos: que "página 2" signifique lo mismo en cualquier pantalla.
  porPagina: 30,
} as const;

export type MetodoPago = keyof typeof POS.metodosPago;

/** Zona de presentación y de corte de día (§2). Una sola constante para todo el sistema. */
export const ZONA_HORARIA = 'America/Mexico_City';
