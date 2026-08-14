import 'server-only';

import { redirect } from 'next/navigation';
import { forbidden } from 'next/navigation';

import { auth } from '@/auth';
import type { Rol } from '@/db/schema';

// §2 — la autorización se verifica EN CADA Server Action y Route Handler, del lado del
// servidor, contra la sesión. Esconder un botón no es autorización.

export type Sesion = {
  userId: number;
  nombre: string;
  rol: Rol;
  branchId: number;
};

/** La sesión actual, o `null` si no hay. No redirige: para eso está `requerirSesion`. */
export async function sesionActual(): Promise<Sesion | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  return {
    userId: Number(s.user.id),
    nombre: s.user.name ?? '',
    rol: s.user.role,
    branchId: s.user.branchId,
  };
}

/** Exige sesión. Sin ella manda a `/login`. */
export async function requerirSesion(): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) redirect('/login');
  return s;
}

/**
 * Exige un rol concreto. Primera línea de toda acción restringida (§2).
 * Sin sesión manda a `/login`; con sesión pero sin el rol, responde 403 —
 * son dos cosas distintas y confundirlas manda a un admin al login por error.
 */
export async function requerirRol(rol: Rol): Promise<Sesion> {
  const s = await requerirSesion();
  if (s.rol !== rol) forbidden();
  return s;
}

/** Variante para Server Actions: devuelve el error de §2 en vez de cortar el render. */
export async function exigirRol(
  rol: Rol,
): Promise<{ ok: true; sesion: Sesion } | { ok: false; error: string }> {
  const s = await sesionActual();
  if (!s) return { ok: false, error: 'Tu sesión terminó. Vuelve a entrar.' };
  if (s.rol !== rol) return { ok: false, error: 'No tienes permiso para hacer eso.' };
  return { ok: true, sesion: s };
}
