// Módulo puro (sin `server-only`, sin `cookies()`): lo consumen tanto el lado servidor
// (`servidor.ts`) como el cliente (`cliente.tsx`) — separado para que un Client Component
// pueda importar `t()`/`Idioma` sin arrastrar `server-only` al bundle del navegador.

import { es, type ClaveI18n } from './es';
import { en } from './en';
import type { Idioma } from './idioma';

export type { ClaveI18n } from './es';
export type { Idioma } from './idioma';

const DICCIONARIOS: Record<Idioma, Record<ClaveI18n, string>> = { es, en };

/** Traduce una clave, con interpolación simple `{parametro}`. */
export function t(
  idioma: Idioma,
  clave: ClaveI18n,
  params?: Record<string, string | number>,
): string {
  const plantilla = DICCIONARIOS[idioma][clave];
  if (!params) return plantilla;
  return plantilla.replace(/\{(\w+)\}/g, (_, llave: string) => String(params[llave] ?? ''));
}
