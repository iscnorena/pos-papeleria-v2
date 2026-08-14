import { ZONA_HORARIA } from '@/config/pos';

// §2 — «hoy» significa el día natural en `America/Mexico_City`, no `new Date()` del
// servidor. En Vercel el servidor corre en UTC: sin esto, todo lo vendido después de las
// 6 de la tarde contaría como del día siguiente.

const PARTES = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** El día natural del negocio, como `YYYY-MM-DD`. Es lo que guarda la columna `date`. */
export function diaDelNegocio(momento = new Date()): string {
  // `en-CA` da exactamente `YYYY-MM-DD`, que es lo que espera Postgres.
  return PARTES.format(momento);
}

/** El mismo día sin guiones, para el folio de §7.3: `20260813`. */
export function diaCompacto(momento = new Date()): string {
  return diaDelNegocio(momento).replace(/-/g, '');
}

/**
 * Los dos extremos, en UTC, del día natural del negocio. Con esto se filtran las ventas
 * «de hoy» sin que la zona del servidor se meta.
 */
export function limitesDelDia(dia: string): { desde: Date; hasta: Date } {
  // Se construye el instante en la zona del negocio preguntando qué desfase tiene ese día:
  // hacerlo a mano con «-06:00» se rompe con el horario de verano.
  const mediodia = new Date(`${dia}T12:00:00Z`);
  const enZona = new Date(mediodia.toLocaleString('en-US', { timeZone: ZONA_HORARIA }));
  const desfase = mediodia.getTime() - enZona.getTime();

  const desde = new Date(new Date(`${dia}T00:00:00Z`).getTime() + desfase);
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
  return { desde, hasta };
}
