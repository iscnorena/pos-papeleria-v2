'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

const esquema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'El proveedor necesita un nombre.')
    .max(160, 'Nombre demasiado largo.'),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .max(13, 'El RFC tiene como máximo 13 caracteres.')
    .optional(),
  contactName: z.string().trim().max(160, 'Nombre de contacto demasiado largo.').optional(),
  phone: z.string().trim().max(40, 'Teléfono demasiado largo.').optional(),
  email: z.string().trim().max(160, 'Correo demasiado largo.').optional(),
  isActive: z.boolean(),
});

export async function guardarProveedor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };

  const analisis = esquema.safeParse({
    id: datos.get('id') || undefined,
    name: datos.get('name'),
    rfc: datos.get('rfc') || undefined,
    contactName: datos.get('contactName') || undefined,
    phone: datos.get('phone') || undefined,
    email: datos.get('email') || undefined,
    isActive: datos.get('isActive') === 'on',
  });
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  const { id, rfc, ...resto } = analisis.data;
  const valores = { ...resto, rfc: rfc && rfc !== '' ? rfc : null };

  try {
    if (id) {
      await db.update(suppliers).set(valores).where(eq(suppliers.id, id));
    } else {
      await db.insert(suppliers).values(valores);
    }
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === '23505') {
      return { error: 'Ya existe un proveedor con ese RFC.' };
    }
    return { error: 'No se pudo guardar el proveedor. Inténtalo de nuevo.' };
  }

  revalidatePath('/proveedores');
  return { ok: true, mensaje: id ? 'Proveedor actualizado.' : 'Proveedor creado.' };
}
