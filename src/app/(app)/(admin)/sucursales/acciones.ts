'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { branches } from '@/db/schema';
import { obtenerIdioma, t, type Idioma } from '@/lib/i18n/servidor';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

const esquema = (idioma: Idioma) =>
  z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z
      .string()
      .trim()
      .min(1, t(idioma, 'sucursales.errorNombreRequerido'))
      .max(120, t(idioma, 'admin.nombreDemasiadoLargo')),
    address: z
      .string()
      .trim()
      .max(200, t(idioma, 'sucursales.errorDireccionDemasiadoLarga'))
      .optional(),
    phone: z.string().trim().max(40, t(idioma, 'admin.telefonoDemasiadoLargo')).optional(),
    whatsappNumber: z
      .string()
      .trim()
      .max(20, t(idioma, 'sucursales.errorNumeroDemasiadoLargo'))
      .optional(),
    isActive: z.boolean(),
  });

export async function guardarSucursal(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  // Primera línea de toda acción restringida (§2). El layout ya bloquea el render, pero
  // una Server Action se puede invocar sin pasar por ninguna página.
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };
  const idioma = await obtenerIdioma();

  const crudo = {
    id: datos.get('id') || undefined,
    name: datos.get('name'),
    address: datos.get('address') || undefined,
    phone: datos.get('phone') || undefined,
    whatsappNumber: datos.get('whatsappNumber') || undefined,
    isActive: datos.get('isActive') === 'on',
  };

  const analisis = esquema(idioma).safeParse(crudo);
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  const { id, ...valores } = analisis.data;

  try {
    if (id) {
      await db.update(branches).set(valores).where(eq(branches.id, id));
    } else {
      await db.insert(branches).values(valores);
    }
  } catch {
    return { error: t(idioma, 'sucursales.errorNoSePudoGuardar') };
  }

  revalidatePath('/sucursales');
  return {
    ok: true,
    mensaje: id ? t(idioma, 'sucursales.exitoActualizada') : t(idioma, 'sucursales.exitoCreada'),
  };
}
