import { ZONA_HORARIA } from '@/config/pos';
import type { Idioma } from '@/lib/i18n/nucleo';

// §2 — la zona de presentación es `ZONA_HORARIA` (la del negocio, configurable por
// instalación — ver `src/config/pos.ts`), siempre, sin importar el idioma de la interfaz
// ni desde dónde se conecte quien mira la pantalla. Lo que SÍ cambia con el idioma es cómo se
// LEEN esos mismos instantes: "lunes, 20 de agosto" vs. "Monday, August 20" — por eso
// `momento`/`fechaLarga` arman el `Intl.DateTimeFormat` según el idioma en vez de usar una
// constante de módulo fija en `'es-MX'` como antes.

const LOCALE_INTL: Record<Idioma, string> = { es: 'es-MX', en: 'en-US' };

function formatoFechaHora(idioma: Idioma): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(LOCALE_INTL[idioma], {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatoFechaLarga(idioma: Idioma): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(LOCALE_INTL[idioma], {
    timeZone: ZONA_HORARIA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** `idioma` por default en `'es'` para no obligar a tocar cada llamador de golpe — se va
 *  actualizando a pasar el idioma real conforme se traduce cada pantalla. */
export function momento(fecha: Date | null | undefined, idioma: Idioma = 'es'): string {
  return fecha ? formatoFechaHora(idioma).format(fecha) : '—';
}

/** "1.2 MB", "340 KB" — para mostrar el tamaño de un archivo que el cliente subió. */
export function tamanoArchivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fechaLarga(fecha: Date, idioma: Idioma = 'es'): string {
  return formatoFechaLarga(idioma).format(fecha);
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
