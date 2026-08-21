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

export type LineaTicketTexto = {
  cantidadTexto: string;
  descripcion: string;
  costoTexto: string;
};

export type ResultadoParseoTicketTexto =
  { ok: true; lineas: LineaTicketTexto[] } | { ok: false; error: string };

const FORMATO_ESPERADO = 'cantidad | descripción | costo unitario';

export function parsearTicketTexto(texto: string): ResultadoParseoTicketTexto {
  const renglones = texto
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r !== '');

  if (renglones.length === 0) {
    return { ok: false, error: 'No se encontró ninguna línea de producto en el texto.' };
  }

  const lineas: LineaTicketTexto[] = [];
  for (let i = 0; i < renglones.length; i++) {
    const numero = i + 1;
    const campos = renglones[i]!.split('|').map((c) => c.trim());

    if (campos.length !== 3) {
      return {
        ok: false,
        error: `La línea ${numero} no tiene el formato esperado: ${FORMATO_ESPERADO}.`,
      };
    }

    const [cantidadTexto, descripcion, costoTexto] = campos as [string, string, string];

    if (cantidadTexto === '' || descripcion === '' || costoTexto === '') {
      return { ok: false, error: `La línea ${numero} tiene un campo vacío.` };
    }
    if (cantidadTexto === '?') {
      return {
        ok: false,
        error: `La línea ${numero} no trae una cantidad legible (marcada con ?).`,
      };
    }
    if (costoTexto === '?') {
      return { ok: false, error: `La línea ${numero} no trae un costo legible (marcado con ?).` };
    }

    lineas.push({ cantidadTexto, descripcion, costoTexto });
  }

  return { ok: true, lineas };
}
