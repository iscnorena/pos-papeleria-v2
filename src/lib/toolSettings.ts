import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { toolSettings } from '@/db/schema';

// Qué herramientas están visibles en /imprimir sin sesión. El `id` es el mismo que usa
// `src/tools/registry.ts` (o `src/tools/pdf/registro.ts` para las sub-herramientas de
// PDF, sin prefijo: 'unir', no 'pdf-unir').
//
// Política: PÚBLICA por defecto. Si una herramienta no tiene fila en `tool_settings`, se
// trata como pública — el admin la apaga a mano desde el interruptor de su pantalla si no
// la quiere ahí (eso sí crea la fila, con `is_public = false`). Antes era al revés
// (privada por defecto); se cambió a pedido explícito del usuario el 19 de agosto de
// 2026: cada herramienta nueva nace visible en público salvo que se apague.

export async function esHerramientaPublica(id: string): Promise<boolean> {
  const [fila] = await db
    .select({ isPublic: toolSettings.isPublic })
    .from(toolSettings)
    .where(eq(toolSettings.id, id))
    .limit(1);
  return fila?.isPublic ?? true;
}

/** De una lista de ids candidatos, cuáles están apagados a mano (privados). Sin fila, una
 * herramienta NO cuenta como privada — es pública por defecto. */
export async function idsPrivadosEntre(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const filas = await db
    .select({ id: toolSettings.id })
    .from(toolSettings)
    .where(and(inArray(toolSettings.id, ids), eq(toolSettings.isPublic, false)));
  return new Set(filas.map((f) => f.id));
}
