'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { db } from '@/db';
import { users } from '@/db/schema';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

const COSTO_BCRYPT = 12; // §5

const esquema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'El usuario necesita un nombre.')
    .max(120, 'Nombre demasiado largo.'),
  username: z
    .string()
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres.')
    .max(40, 'Usuario demasiado largo.')
    .regex(/^[a-z0-9._-]+$/, 'Solo minúsculas, números, punto, guion y guion bajo.'),
  role: z.enum(['admin', 'cajera']),
  branchId: z.coerce.number().int().positive('Elige una sucursal.'),
  isActive: z.boolean(),
  // Vacíos significan «no cambiar», que es lo que se espera al editar.
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.').optional(),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, 'El PIN son 4 a 6 dígitos.')
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

  const analisis = esquema.safeParse({
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
    return { errores: { password: 'Un usuario nuevo necesita contraseña.' } };
  }

  const [conMismoUsuario] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, valores.username))
    .limit(1);
  if (conMismoUsuario && conMismoUsuario.id !== id) {
    return { errores: { username: 'Ese nombre de usuario ya existe.' } };
  }

  if (pin && (await pinYaUsado(pin, id))) {
    return { errores: { pin: 'Ese PIN ya lo usa otra persona. Elige otro.' } };
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
    return { error: 'No se pudo guardar el usuario. Inténtalo de nuevo.' };
  }

  revalidatePath('/usuarios');
  return {
    ok: true,
    mensaje: id ? 'Usuario actualizado.' : 'Usuario creado.',
  };
}
