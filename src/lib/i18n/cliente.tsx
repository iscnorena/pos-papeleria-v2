'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { t as traducir, type ClaveI18n, type Idioma } from './nucleo';

// El idioma inicial SIEMPRE llega ya resuelto por el servidor (ver `IdiomaProvider` en
// src/app/layout.tsx) — nunca se detecta en el cliente, así que no hay parpadeo ni
// desincronía posible con lo que el servidor ya renderizó en ese idioma.

type ContextoIdioma = {
  idioma: Idioma;
  t: (clave: ClaveI18n, params?: Record<string, string | number>) => string;
};

const ContextoIdiomaCtx = createContext<ContextoIdioma | null>(null);

export function IdiomaProvider({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  const valor = useMemo<ContextoIdioma>(
    () => ({ idioma, t: (clave, params) => traducir(idioma, clave, params) }),
    [idioma],
  );
  return <ContextoIdiomaCtx.Provider value={valor}>{children}</ContextoIdiomaCtx.Provider>;
}

/** Para Client Components: `const { t, idioma } = useIdioma();`. Debe montarse dentro de
 *  `IdiomaProvider` (ya envuelve todo `<body>` desde el layout raíz). */
export function useIdioma(): ContextoIdioma {
  const ctx = useContext(ContextoIdiomaCtx);
  if (!ctx) throw new Error('useIdioma() necesita <IdiomaProvider> como ancestro.');
  return ctx;
}
