'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { productCategories } from '@/db/schema';
import { obtenerIdioma, t, type Idioma } from '@/lib/i18n/servidor';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

const esquema = (idioma: Idioma) =>
  z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z
      .string()
      .trim()
      .min(1, t(idioma, 'categorias.errorNombreRequerido'))
      .max(120, t(idioma, 'admin.nombreDemasiadoLargo')),
    description: z
      .string()
      .trim()
      .max(300, t(idioma, 'categorias.errorDescripcionDemasiadoLarga'))
      .optional(),
    isActive: z.boolean(),
  });

export async function guardarCategoria(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };
  const idioma = await obtenerIdioma();

  const analisis = esquema(idioma).safeParse({
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
    return { error: t(idioma, 'categorias.errorNoSePudoGuardar') };
  }

  revalidatePath('/categorias');
  revalidatePath('/productos');
  return {
    ok: true,
    mensaje: id ? t(idioma, 'categorias.exitoActualizada') : t(idioma, 'categorias.exitoCreada'),
  };
}
