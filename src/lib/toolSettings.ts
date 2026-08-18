import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { toolSettings } from '@/db/schema';

// Qué herramientas están visibles en /imprimir sin sesión. El `id` es el mismo que usa
// `src/tools/registry.ts` (o `src/tools/pdf/registro.ts` para las sub-herramientas de
// PDF, sin prefijo: 'unir', no 'pdf-unir'). Si una herramienta no tiene fila en
// `tool_settings`, se trata como privada — nunca pública por accidente.

export async function esHerramientaPublica(id: string): Promise<boolean> {
  const [fila] = await db
    .select({ isPublic: toolSettings.isPublic })
    .from(toolSettings)
    .where(eq(toolSettings.id, id))
    .limit(1);
  return fila?.isPublic ?? false;
}

/** De una lista de ids candidatos, cuáles están marcados como públicos. */
export async function idsPublicosEntre(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const filas = await db
    .select({ id: toolSettings.id })
    .from(toolSettings)
    .where(and(inArray(toolSettings.id, ids), eq(toolSettings.isPublic, true)));
  return new Set(filas.map((f) => f.id));
}
