import 'server-only';

import { cookies } from 'next/headers';

import { IDIOMA_COOKIE, IDIOMA_POR_DEFECTO, esIdioma, type Idioma } from './idioma';

export { IDIOMA_COOKIE, IDIOMA_POR_DEFECTO } from './idioma';
export { t } from './nucleo';
export type { ClaveI18n, Idioma } from './nucleo';

// Idioma vive en una cookie, no en localStorage: a diferencia del tema (que solo cambia
// CSS y por eso podía resolverse 100% en el navegador), casi todo el texto lo generan
// Server Components async — necesitan poder leer el idioma en el servidor, donde
// localStorage no existe. Cambiar de idioma implica refrescar ese árbol
// (`router.refresh()` tras la Server Action que fija la cookie, ver
// `src/app/acciones-idioma.ts`), no es instantáneo como el tema.

/** Lee la cookie de idioma. `'es'` si no hay preferencia guardada (comportamiento actual
 *  de todos los usuarios existentes, sin sorpresas). */
export async function obtenerIdioma(): Promise<Idioma> {
  const valor = (await cookies()).get(IDIOMA_COOKIE)?.value;
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO;
}
