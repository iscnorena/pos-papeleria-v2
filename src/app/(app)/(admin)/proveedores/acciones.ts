'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { obtenerIdioma, t, type Idioma } from '@/lib/i18n/servidor';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

const esquema = (idioma: Idioma) =>
  z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z
      .string()
      .trim()
      .min(1, t(idioma, 'proveedores.errorNombreRequerido'))
      .max(160, t(idioma, 'admin.nombreDemasiadoLargo')),
    rfc: z
      .string()
      .trim()
      .toUpperCase()
      .max(13, t(idioma, 'proveedores.errorRfcDemasiadoLargo'))
      .optional(),
    contactName: z
      .string()
      .trim()
      .max(160, t(idioma, 'proveedores.errorContactoDemasiadoLargo'))
      .optional(),
    phone: z.string().trim().max(40, t(idioma, 'admin.telefonoDemasiadoLargo')).optional(),
    email: z.string().trim().max(160, t(idioma, 'admin.correoDemasiadoLargo')).optional(),
    isActive: z.boolean(),
  });

export async function guardarProveedor(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };
  const idioma = await obtenerIdioma();

  const analisis = esquema(idioma).safeParse({
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
      return { error: t(idioma, 'proveedores.errorYaExisteRfc') };
    }
    return { error: t(idioma, 'proveedores.errorNoSePudoGuardar') };
  }

  revalidatePath('/proveedores');
  return {
    ok: true,
    mensaje: id ? t(idioma, 'proveedores.exitoActualizado') : t(idioma, 'proveedores.exitoCreado'),
  };
}
