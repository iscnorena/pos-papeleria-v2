'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { productCategories } from '@/db/schema';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

const esquema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'La categoría necesita un nombre.')
    .max(120, 'Nombre demasiado largo.'),
  description: z.string().trim().max(300, 'Descripción demasiado larga.').optional(),
  isActive: z.boolean(),
});

export async function guardarCategoria(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };

  const analisis = esquema.safeParse({
    id: datos.get('id') || undefined,
    name: datos.get('name'),
    description: datos.get('description') || undefined,
    isActive: datos.get('isActive') === 'on',
  });
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  const { id, ...valores } = analisis.data;

  try {
    if (id) {
      await db.update(productCategories).set(valores).where(eq(productCategories.id, id));
    } else {
      await db.insert(productCategories).values(valores);
    }
  } catch {
    return { error: 'No se pudo guardar la categoría. Inténtalo de nuevo.' };
  }

  revalidatePath('/categorias');
  revalidatePath('/productos');
  return { ok: true, mensaje: id ? 'Categoría actualizada.' : 'Categoría creada.' };
}
