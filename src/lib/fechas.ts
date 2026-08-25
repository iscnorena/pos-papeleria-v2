import { ZONA_HORARIA } from '@/config/pos';

// §2 — «hoy» significa el día natural en `ZONA_HORARIA` (la del negocio, configurable por
// instalación — ver `src/config/pos.ts`), no `new Date()` del servidor. En Vercel el
// servidor corre en UTC: sin esto, todo lo vendido después de las 6 de la tarde local
// contaría como del día siguiente.

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
 * Cuántos minutos separan la zona del negocio de UTC en un instante dado. Negativo al
 * oeste de Greenwich: la Ciudad de México da −360 o −300 según el horario de verano.
 *
 * Se le pregunta a `Intl`, que conoce la base de datos de zonas horarias. Escribir «−6h»
 * a mano se rompe dos veces al año, y usar `toLocaleString` + `new Date` —que era lo que
 * había aquí— hace que el resultado dependa de la zona de la MÁQUINA: daba bien en Vercel
 * (que corre en UTC) y mal en cualquier equipo configurado en la hora de México.
 */
function desfaseEnMinutos(momento: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA,
    timeZoneName: 'longOffset',
  }).formatToParts(momento);

  const nombre = partes.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const coincidencia = /GMT([+-])(\d{2}):(\d{2})/.exec(nombre);
  if (!coincidencia) return 0;

  const [, signo, horas, minutos] = coincidencia;
  return (signo === '-' ? -1 : 1) * (Number(horas) * 60 + Number(minutos));
}

/**
 * Los dos extremos, en UTC, del día natural del negocio. Con esto se filtran las ventas
 * «de hoy» sin que la zona del servidor se meta.
 */
export function limitesDelDia(dia: string): { desde: Date; hasta: Date } {
  // El desfase se mide al mediodía UTC de ese día: es la hora que nunca cae dentro del
  // salto de horario de verano, que ocurre de madrugada.
  const minutos = desfaseEnMinutos(new Date(`${dia}T12:00:00Z`));

  const desde = new Date(new Date(`${dia}T00:00:00Z`).getTime() - minutos * 60_000);
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
  return { desde, hasta };
}
