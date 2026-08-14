import { ZONA_HORARIA } from '@/config/pos';

// §2 — la zona de presentación es `America/Mexico_City`, en una constante única. Nunca se
// usa la hora del servidor para mostrar ni para cortar el día.

const FECHA_HORA = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_HORARIA,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const FECHA_LARGA = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_HORARIA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function momento(fecha: Date | null | undefined): string {
  return fecha ? FECHA_HORA.format(fecha) : '—';
}

export function fechaLarga(fecha: Date): string {
  return FECHA_LARGA.format(fecha);
}

/**
 * Color de una diferencia de caja (§7.5): cero en `visto`, falta en `sello`, sobra en
 * `grafito`. Que sobre dinero no es bueno ni malo — es una nota, no una alarma.
 */
export function tonoDiferencia(centavos: number): string {
  if (centavos === 0) return 'text-visto';
  if (centavos < 0) return 'text-sello';
  return 'text-grafito';
}
