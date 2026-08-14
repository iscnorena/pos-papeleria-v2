import { requerirRol } from '@/lib/sesion';

// Muro único para todas las pantallas de administración. `requerirRol` responde 403 de
// verdad cuando hay sesión pero el rol no alcanza — criterio 2 de la Fase 2: una cajera
// que escriba `/productos` a mano recibe 403, no una redirección silenciosa.
//
// Esto NO sustituye la comprobación de cada Server Action: un layout protege el render,
// no la mutación (§2).

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await requerirRol('admin');
  return <>{children}</>;
}
