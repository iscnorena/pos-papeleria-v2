// Preferencia de tema visual (Clásico/Moderno). Es de ESTE navegador, no del negocio —
// mismo criterio que los presets de Acomoda Impresión (src/tools/acomoda-impresion/
// presets.ts) — así que vive en `localStorage`, no en la base.

export type Tema = 'clasico' | 'moderno';

export const TEMA_STORAGE_KEY = 'pos.tema';
export const TEMA_POR_DEFECTO: Tema = 'clasico';

function esTema(valor: unknown): valor is Tema {
  return valor === 'clasico' || valor === 'moderno';
}

/** `null` si no hay preferencia guardada (o `localStorage` no está disponible/corrupto):
 *  el llamador decide el valor por defecto. */
export function leerTemaGuardado(): Tema | null {
  if (typeof window === 'undefined') return null;
  try {
    const crudo = window.localStorage.getItem(TEMA_STORAGE_KEY);
    return esTema(crudo) ? crudo : null;
  } catch {
    // Un `localStorage` corrupto o bloqueado no debe tumbar nada.
    return null;
  }
}

export function guardarTema(tema: Tema): void {
  try {
    window.localStorage.setItem(TEMA_STORAGE_KEY, tema);
  } catch {
    // Sin storage disponible, el tema simplemente no persiste entre sesiones.
  }
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'moderno' ? '#F5F7FB' : '#FAF9F4');
}
