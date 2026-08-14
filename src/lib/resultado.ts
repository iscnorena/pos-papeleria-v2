import type { ZodError } from 'zod';

// §2 — toda Server Action regresa `{ ok: true, data }` o `{ ok: false, error }` con mensaje
// en español apto para mostrarse. Nada de excepciones crudas al cliente.

export type Resultado<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Estado de un formulario. Además del mensaje general lleva `errores` por campo, porque
 * el criterio 1 de la Fase 2 pide la validación visible **en el campo que falla**.
 */
export type EstadoFormulario = {
  ok?: boolean;
  mensaje?: string;
  error?: string;
  errores?: Record<string, string>;
};

export const FORMULARIO_INICIAL: EstadoFormulario = {};

/** Pasa los problemas de Zod a un mapa `campo → mensaje`, que es lo que pinta el formulario. */
export function erroresDeZod(error: ZodError): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path[0];
    if (typeof campo === 'string' && !mapa[campo]) mapa[campo] = problema.message;
  }
  return mapa;
}
