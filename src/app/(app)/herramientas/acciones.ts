'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { toolSettings } from '@/db/schema';
import { exigirRol } from '@/lib/sesion';

// Un solo interruptor por herramienta, compartido por todas las pantallas de
// /herramientas/* (Rifas, Acomodar impresión, y cada sub-herramienta de PDF): prende o
// apaga su fila en `tool_settings`, y listo — el índice público de /imprimir lee esa
// misma tabla al armar la lista.
//
// Hay que revalidar TRES cosas, no solo el índice: la propia ruta pública de la
// herramienta (`/imprimir/rifas`, etc. — que también lee `tool_settings` para decidir si
// bloquea con "no disponible") y los dos índices que pueden listarla o dejar de listarla.
// Sin la ruta propia, el checkbox se ve prendido en /herramientas pero la URL directa
// sigue sirviendo la respuesta cacheada de antes de prenderlo.

export async function alternarVisibilidadPublica(
  id: string,
  publica: boolean,
  rutaPublica: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { ok: false, error: permiso.error };

  try {
    await db
      .insert(toolSettings)
      .values({ id, isPublic: publica })
      .onConflictDoUpdate({
        target: toolSettings.id,
        set: { isPublic: publica, updatedAt: new Date() },
      });
  } catch {
    return { ok: false, error: 'No se pudo guardar. Inténtalo de nuevo.' };
  }

  revalidatePath(rutaPublica);
  revalidatePath('/imprimir');
  revalidatePath('/imprimir/pdf');
  return { ok: true };
}
