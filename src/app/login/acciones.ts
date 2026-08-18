'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { z } from 'zod';

import { signIn } from '@/auth';
import { anotarIntento, intentosRecientes, ipDelCliente } from '@/lib/limiteIntentos';

// §5 — límite de intentos del login por PIN: 5 fallos por IP en 15 minutos, con respuesta
// genérica que no revela si el PIN existe.

const MAX_INTENTOS = 5;
const VENTANA_MINUTOS = 15;

export type EstadoLogin = { error?: string };

const esquemaContrasena = z.object({
  usuario: z.string().trim().min(1, 'Escribe tu usuario.'),
  contrasena: z.string().min(1, 'Escribe tu contraseña.'),
});

const esquemaPin = z.string().regex(/^\d{4,6}$/, 'El PIN son 4 a 6 dígitos.');

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

  if ((await intentosRecientes(ip, 'pin', VENTANA_MINUTOS)) >= MAX_INTENTOS) {
    return { error: 'Demasiados intentos, espera unos minutos.' };
  }

  const analisis = esquemaPin.safeParse(datos.get('pin'));
  if (!analisis.success) {
    // Un PIN mal formado también gasta intento: si no, probar 0000…9999 saldría gratis
    // mandando cadenas de 3 dígitos.
    await anotarIntento(ip, 'pin');
    return { error: analisis.error.issues[0]?.message ?? 'PIN incorrecto.' };
  }

  try {
    await signIn('pin', { pin: analisis.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      await anotarIntento(ip, 'pin');
      return { error: 'PIN incorrecto.' };
    }
    throw error;
  }

  redirect(destinoSeguro(datos.get('siguiente')));
}
