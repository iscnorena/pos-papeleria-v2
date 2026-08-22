'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { db } from '@/db';
import { users } from '@/db/schema';
import { obtenerIdioma, t, type Idioma } from '@/lib/i18n/servidor';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

const COSTO_BCRYPT = 12; // §5

const esquema = (idioma: Idioma) =>
  z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z
      .string()
      .trim()
      .min(1, t(idioma, 'usuarios.errorNombreRequerido'))
      .max(120, t(idioma, 'admin.nombreDemasiadoLargo')),
    username: z
      .string()
      .trim()
      .min(3, t(idioma, 'usuarios.errorUsuarioMinimo'))
      .max(40, t(idioma, 'usuarios.errorUsuarioDemasiadoLargo'))
      .regex(/^[a-z0-9._-]+$/, t(idioma, 'usuarios.errorUsuarioFormato')),
    role: z.enum(['admin', 'cajera']),
    branchId: z.coerce.number().int().positive(t(idioma, 'usuarios.errorEligeSucursal')),
    isActive: z.boolean(),
    // Vacíos significan «no cambiar», que es lo que se espera al editar.
    password: z.string().min(6, t(idioma, 'usuarios.errorContrasenaMinima')).optional(),
    pin: z
      .string()
      .regex(/^\d{4,6}$/, t(idioma, 'usuarios.errorPinFormato'))
      .optional(),
  });

/**
 * §5 pide que el PIN sea único. Como se guarda con bcrypt, no se puede buscar por igualdad:
 * hay que comparar contra cada PIN existente. Aquí sí importa hacerlo — es el único punto
 * donde se puede garantizar la unicidad, y de eso depende que el login por PIN sea
 * determinista en vez de entrar «al primero que coincida».
 */
async function pinYaUsado(pin: string, exceptoId?: number): Promise<boolean> {
  const condicion = exceptoId
    ? and(isNotNull(users.pinHash), ne(users.id, exceptoId))
    : isNotNull(users.pinHash);

  const otros = await db.select({ pinHash: users.pinHash }).from(users).where(condicion);
  for (const { pinHash } of otros) {
    if (pinHash && (await bcrypt.compare(pin, pinHash))) return true;
  }
  return false;
}

export async function guardarUsuario(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };
  const idioma = await obtenerIdioma();

  const analisis = esquema(idioma).safeParse({
    id: datos.get('id') || undefined,
    name: datos.get('name'),
    username: datos.get('username'),
    role: datos.get('role'),
    branchId: datos.get('branchId'),
    isActive: datos.get('isActive') === 'on',
    password: datos.get('password') || undefined,
    pin: datos.get('pin') || undefined,
  });
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  const { id, password, pin, ...valores } = analisis.data;

  if (!id && !password) {
    return { errores: { password: t(idioma, 'usuarios.errorNecesitaContrasena') } };
  }

  const [conMismoUsuario] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, valores.username))
    .limit(1);
  if (conMismoUsuario && conMismoUsuario.id !== id) {
    return { errores: { username: t(idioma, 'usuarios.errorUsuarioYaExiste') } };
  }

  if (pin && (await pinYaUsado(pin, id))) {
    return { errores: { pin: t(idioma, 'usuarios.errorPinYaUsado') } };
  }

  try {
    if (id) {
      await db
        .update(users)
        .set({
          ...valores,
          ...(password ? { passwordHash: await bcrypt.hash(password, COSTO_BCRYPT) } : {}),
          ...(pin ? { pinHash: await bcrypt.hash(pin, COSTO_BCRYPT) } : {}),
        })
        .where(eq(users.id, id));
    } else {
      await db.insert(users).values({
        ...valores,
        passwordHash: await bcrypt.hash(password!, COSTO_BCRYPT),
        ...(pin ? { pinHash: await bcrypt.hash(pin, COSTO_BCRYPT) } : {}),
      });
    }
  } catch {
    return { error: t(idioma, 'usuarios.errorNoSePudoGuardar') };
  }

  revalidatePath('/usuarios');
  return {
    ok: true,
    mensaje: id ? t(idioma, 'usuarios.exitoActualizado') : t(idioma, 'usuarios.exitoCreado'),
  };
}
