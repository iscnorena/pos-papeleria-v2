'use server';

import { cookies } from 'next/headers';

import { IDIOMA_COOKIE, type Idioma } from '@/lib/i18n/idioma';

/** Guarda la preferencia de idioma. Cualquier sesión (o ninguna — el ticket público
 *  también tiene su propio selector) puede llamarla: no hay nada que proteger aquí. Quien
 *  llama debe hacer `router.refresh()` después para que el árbol de Server Components se
 *  vuelva a renderizar en el idioma nuevo. */
export async function cambiarIdioma(idioma: Idioma): Promise<void> {
  (await cookies()).set(IDIOMA_COOKIE, idioma, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
