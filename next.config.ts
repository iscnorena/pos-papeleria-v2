import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Habilita `forbidden()` y `unauthorized()` de `next/navigation`, con sus páginas
    // `forbidden.tsx` / `unauthorized.tsx`. Sin esta bandera, una página no puede
    // responder 403: solo `notFound()` (404) puede fijar el estado HTTP.
    //
    // La Fase 2 lo pide explícito («una cajera que visite /productos recibe 403, aunque
    // escriba la URL a mano»), y un 404 mentiría sobre lo que pasó. Es experimental: si
    // una versión futura lo cambia, el reemplazo es un Route Handler que responda 403.
    authInterrupts: true,
  },
};

export default nextConfig;
