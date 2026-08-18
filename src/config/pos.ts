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

export type MetodoPago = keyof typeof POS.metodosPago;

/** Zona de presentación y de corte de día (§2). Una sola constante para todo el sistema. */
export const ZONA_HORARIA = 'America/Mexico_City';
