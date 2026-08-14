'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { AuthError } from 'next-auth';
import { and, count, eq, gt } from 'drizzle-orm';
import { z } from 'zod';

import { signIn } from '@/auth';
import { db } from '@/db';
import { loginAttempts } from '@/db/schema';

// §5 — límite de intentos del login por PIN: 5 fallos por IP en 15 minutos, con respuesta
// genérica que no revela si el PIN existe. Los intentos van a la base y no a memoria
// porque cada request puede caer en una instancia distinta (§1.1).

const MAX_INTENTOS = 5;
const VENTANA_MINUTOS = 15;

export type EstadoLogin = { error?: string };

const esquemaContrasena = z.object({
  usuario: z.string().trim().min(1, 'Escribe tu usuario.'),
  contrasena: z.string().min(1, 'Escribe tu contraseña.'),
});

const esquemaPin = z.string().regex(/^\d{4,6}$/, 'El PIN son 4 a 6 dígitos.');

async function ipDelCliente(): Promise<string> {
  const h = await headers();
  // En Vercel el proxy pone la IP real al frente de `x-forwarded-for`.
  const reenviada = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return reenviada || h.get('x-real-ip') || 'desconocida';
}

async function intentosRecientes(ip: string, tipo: string): Promise<number> {
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000);
  const [fila] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.kind, tipo),
        gt(loginAttempts.attemptedAt, desde),
      ),
    );
  return fila?.n ?? 0;
}

async function anotarFallo(ip: string, tipo: string): Promise<void> {
  await db.insert(loginAttempts).values({ ip, kind: tipo });
}

/** A dónde ir después de entrar. Solo rutas internas: un destino externo sería un salto abierto. */
function destinoSeguro(siguiente: FormDataEntryValue | null): string {
  const s = typeof siguiente === 'string' ? siguiente : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/';
}

export async function entrarConContrasena(
  _previo: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const analisis = esquemaContrasena.safeParse({
    usuario: datos.get('usuario'),
    contrasena: datos.get('contrasena'),
  });
  if (!analisis.success) {
    return { error: analisis.error.issues[0]?.message ?? 'Revisa los datos.' };
  }

  try {
    await signIn('password', { ...analisis.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // Mensaje único a propósito: no debe revelar si el usuario existe.
      return { error: 'Usuario o contraseña incorrectos.' };
    }
    throw error;
  }

  redirect(destinoSeguro(datos.get('siguiente')));
}

export async function entrarConPin(_previo: EstadoLogin, datos: FormData): Promise<EstadoLogin> {
  const ip = await ipDelCliente();

  if ((await intentosRecientes(ip, 'pin')) >= MAX_INTENTOS) {
    return { error: 'Demasiados intentos, espera unos minutos.' };
  }

  const analisis = esquemaPin.safeParse(datos.get('pin'));
  if (!analisis.success) {
    // Un PIN mal formado también gasta intento: si no, probar 0000…9999 saldría gratis
    // mandando cadenas de 3 dígitos.
    await anotarFallo(ip, 'pin');
    return { error: analisis.error.issues[0]?.message ?? 'PIN incorrecto.' };
  }

  try {
    await signIn('pin', { pin: analisis.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      await anotarFallo(ip, 'pin');
      return { error: 'PIN incorrecto.' };
    }
    throw error;
  }

  redirect(destinoSeguro(datos.get('siguiente')));
}
