import { redirect } from 'next/navigation';

// La raíz no tiene contenido propio: manda al tablero. Sin sesión, el `proxy` ya habrá
// desviado a `/login` antes de llegar aquí.
export default function Raiz() {
  redirect('/dashboard');
}
