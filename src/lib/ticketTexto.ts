// Recepción de Mercancía — vía "pegar texto" y vía "foto" (ambas comparten este parser).
// El texto lo genera un humano pidiéndole a Claude, fuera de este sistema o vía la API
// (`claudeVision.ts`), que lea la foto de un ticket y devuelva el listado en un formato
// fijo y predecible — no hay nada de lenguaje natural que interpretar aquí, a diferencia
// de `vozTicket.ts`. Módulo puro, sin DB ni Next: se prueba con Vitest.
//
// Formato esperado, una línea por producto:
//   cantidad | descripción | costo unitario
// Líneas en blanco se ignoran. Si un dato no se pudo leer con certeza, debe venir como
// `?` en vez de un valor inventado (mismo principio que `vozTicket.ts`: nunca asumir un
// valor por default) — y eso hace fallar el parseo completo, señalando la línea, para que
// el usuario corrija el texto (o el prompt que le dio a Claude) y reintente.

import { t, type Idioma } from '@/lib/i18n/nucleo';

export type LineaTicketTexto = {
  cantidadTexto: string;
  descripcion: string;
  costoTexto: string;
};

export type ResultadoParseoTicketTexto =
  { ok: true; lineas: LineaTicketTexto[] } | { ok: false; error: string };

/** `idioma` en `'es'` por default: mantiene el comportamiento (y los mensajes) de siempre
 *  para quien no lo pase explícitamente — solo `acciones.ts` lo resuelve y lo pasa. */
export function parsearTicketTexto(
  texto: string,
  idioma: Idioma = 'es',
): ResultadoParseoTicketTexto {
  const formatoEsperado = t(idioma, 'recepcion.ticketTexto.formato');
  const renglones = texto
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r !== '');

  if (renglones.length === 0) {
    return { ok: false, error: t(idioma, 'recepcion.ticketTexto.sinLineas') };
  }

  const lineas: LineaTicketTexto[] = [];
  for (let i = 0; i < renglones.length; i++) {
    const numero = i + 1;
    const campos = renglones[i]!.split('|').map((c) => c.trim());

    if (campos.length !== 3) {
      return {
        ok: false,
        error: t(idioma, 'recepcion.ticketTexto.formatoInvalido', {
          n: numero,
          formato: formatoEsperado,
        }),
      };
    }

    const [cantidadTexto, descripcion, costoTexto] = campos as [string, string, string];

    if (cantidadTexto === '' || descripcion === '' || costoTexto === '') {
      return { ok: false, error: t(idioma, 'recepcion.ticketTexto.campoVacio', { n: numero }) };
    }
    if (cantidadTexto === '?') {
      return {
        ok: false,
        error: t(idioma, 'recepcion.ticketTexto.cantidadIlegible', { n: numero }),
      };
    }
    if (costoTexto === '?') {
      return { ok: false, error: t(idioma, 'recepcion.ticketTexto.costoIlegible', { n: numero }) };
    }

    lineas.push({ cantidadTexto, descripcion, costoTexto });
  }

  return { ok: true, lineas };
}
