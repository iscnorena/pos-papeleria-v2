import { NextResponse } from 'next/server';

import { auth } from '@/auth';

// En Next.js 16 el middleware se llama `proxy`: mismo comportamiento, otro nombre y otro
// archivo (`middleware.ts` → `proxy.ts`, export `middleware` → export `proxy`). Además
// corre siempre en runtime `nodejs`, que no se puede configurar — lo cual aquí conviene,
// porque la sesión se resuelve con el mismo `auth` que usa el resto del servidor.
//
// §5: protege todo salvo `/login` y los recursos estáticos. Esto es una comprobación
// optimista de sesión, no la autorización: el rol se revalida en cada Server Action (§2).

/**
 * Rutas que se ven sin sesión.
 *
 * `/ticket/…` está aquí a propósito (§6): el cliente abre su ticket desde el teléfono y no
 * tiene cuenta. Lo que la protege no es la sesión sino el token opaco de 32 bytes, que no
 * se puede adivinar ni recorrer — por eso la URL lleva el token y nunca el id de la venta.
 *
 * `/kit` es el índice de herramientas públicas, sin cuenta (hoy: Acomoda Impresión en
 * `/kit/acomoda-impresion`, e irá creciendo). Como el filtro es por prefijo, cualquier
 * subruta nueva bajo `/kit/` queda pública sin tocar esta función. `/api/kit/…`
 * son las rutas de apoyo de Acomoda Impresión pública (búsqueda en bancos de imágenes), con
 * su propio límite por IP en vez de sesión — ver `src/lib/limiteIntentos.ts`.
 */
function esPublica(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/ticket/') ||
    pathname === '/kit' ||
    pathname.startsWith('/kit/') ||
    pathname.startsWith('/api/kit/')
  );
}

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const haySesion = Boolean(req.auth?.user);

  if (!haySesion && !esPublica(pathname)) {
    const destino = new URL('/login', req.nextUrl);
    // Se recuerda a dónde iba para volver ahí después de entrar.
    if (pathname !== '/') destino.searchParams.set('siguiente', pathname + search);
    return NextResponse.redirect(destino);
  }

  if (haySesion && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Todo menos los recursos que no son páginas. `api/auth` queda fuera o el propio flujo
  // de login se redirigiría a sí mismo.
  matcher: ['/((?!api/auth|_next/static|_next/image|fonts|favicon.ico|.*\\.(?:svg|png|woff2)$).*)'],
};
