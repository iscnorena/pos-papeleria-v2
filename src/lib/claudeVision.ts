import Anthropic from '@anthropic-ai/sdk';

import { RECEPCION } from '@/config/pos';
import { t, type Idioma } from '@/lib/i18n/nucleo';

// Integración opcional con la API de Claude (vía "foto" de Recepción de Mercancía).
// Apagada por defecto — solo se llama si `claude_integration.api_key` tiene un valor (ver
// `src/app/(app)/recepcion/acciones.ts`). El prompt pide EXACTAMENTE el mismo formato que
// espera `parsearTicketTexto`, para que ambas vías (pegar texto a mano / subir foto)
// compartan por completo el parser y la validación de líneas.
//
// El PROMPT que se le manda a Claude se queda SIEMPRE en español, sin importar el idioma
// de quien usa el sistema: es una instrucción para la API, no algo que un humano lea, y
// Claude la entiende igual de bien en cualquier idioma — traducirla no le sirve a nadie y
// solo sumaría una superficie más que mantener sincronizada con `parsearTicketTexto`.

export type ResultadoClaudeVision = { ok: true; texto: string } | { ok: false; error: string };

const PROMPT = `Lee la foto de este ticket o factura de compra y devuelve el listado de \
productos, uno por línea, en este formato exacto y nada más (sin encabezados, sin texto \
antes o después, sin markdown):

cantidad | descripción | costo unitario

Reglas:
- Un producto por línea, separando los 3 campos con "|".
- Cantidad y costo unitario con punto decimal, sin símbolo de $ ni comas de miles.
- El costo unitario es el precio ya final de cada producto tal como aparece en el ticket.
- Si no puedes leer con certeza la cantidad o el costo de una línea, escribe "?" en ese \
campo en vez de inventar un valor.
- No incluyas totales, subtotales, impuestos ni ninguna línea que no sea un producto.`;

/** `idioma` en `'es'` por default — quien no lo pase explícitamente conserva el
 *  comportamiento/mensajes de siempre. */
export async function extraerListadoDeTicket(
  apiKey: string,
  imagenBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  idioma: Idioma = 'es',
): Promise<ResultadoClaudeVision> {
  const cliente = new Anthropic({ apiKey });

  try {
    const respuesta = await cliente.messages.create({
      model: RECEPCION.modeloClaudeVision,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imagenBase64 },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const bloqueTexto = respuesta.content.find((b) => b.type === 'text');
    if (!bloqueTexto || bloqueTexto.type !== 'text' || bloqueTexto.text.trim() === '') {
      return { ok: false, error: t(idioma, 'recepcion.claudeVision.sinTextoLegible') };
    }

    return { ok: true, texto: bloqueTexto.text };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: t(idioma, 'recepcion.claudeVision.claveInvalida') };
    }
    return { ok: false, error: t(idioma, 'recepcion.claudeVision.errorGenerico') };
  }
}
