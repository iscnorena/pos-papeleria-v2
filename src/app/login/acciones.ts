'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { z } from 'zod';

import { signIn } from '@/auth';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { anotarIntento, intentosRecientes, ipDelCliente } from '@/lib/limiteIntentos';

// §5 — límite de intentos del login por PIN: 5 fallos por IP en 15 minutos, con respuesta
// genérica que no revela si el PIN existe.

const MAX_INTENTOS = 5;
const VENTANA_MINUTOS = 15;

export type EstadoLogin = { error?: string };

// Los esquemas son funciones (no constantes de módulo) porque el mensaje de cada
// validación depende del idioma de quien llena el formulario — se arman de nuevo en
// cada envío con el idioma ya resuelto (ver `obtenerIdioma()` abajo).
function esquemaContrasena(idioma: Awaited<ReturnType<typeof obtenerIdioma>>) {
  return z.object({
    usuario: z.string().trim().min(1, t(idioma, 'login.escribeUsuario')),
    contrasena: z.string().min(1, t(idioma, 'login.escribeContrasena')),
  });
}

function esquemaPin(idioma: Awaited<ReturnType<typeof obtenerIdioma>>) {
  return z.string().regex(/^\d{4,6}$/, t(idioma, 'login.pinFormato'));
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
  const idioma = await obtenerIdioma();

  const analisis = esquemaContrasena(idioma).safeParse({
    usuario: datos.get('usuario'),
    contrasena: datos.get('contrasena'),
  });
  if (!analisis.success) {
    return { error: analisis.error.issues[0]?.message ?? t(idioma, 'login.revisaLosDatos') };
  }

  try {
    await signIn('password', { ...analisis.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // Mensaje único a propósito: no debe revelar si el usuario existe.
      return { error: t(idioma, 'login.usuarioOContrasenaIncorrectos') };
    }
    throw error;
  }

  redirect(destinoSeguro(datos.get('siguiente')));
}

export async function entrarConPin(_previo: EstadoLogin, datos: FormData): Promise<EstadoLogin> {
  const idioma = await obtenerIdioma();
  const ip = await ipDelCliente();

  if ((await intentosRecientes(ip, 'pin', VENTANA_MINUTOS)) >= MAX_INTENTOS) {
    return { error: t(idioma, 'login.demasiadosIntentos') };
  }

  const analisis = esquemaPin(idioma).safeParse(datos.get('pin'));
  if (!analisis.success) {
    // Un PIN mal formado también gasta intento: si no, probar 0000…9999 saldría gratis
    // mandando cadenas de 3 dígitos.
    await anotarIntento(ip, 'pin');
    return { error: analisis.error.issues[0]?.message ?? t(idioma, 'login.pinIncorrecto') };
  }

  try {
    await signIn('pin', { pin: analisis.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      await anotarIntento(ip, 'pin');
      return { error: t(idioma, 'login.pinIncorrecto') };
    }
    throw error;
  }

  redirect(destinoSeguro(datos.get('siguiente')));
}
