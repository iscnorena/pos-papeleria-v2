import { forbidden, notFound } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { requerirSesion } from '@/lib/sesion';
import { herramientaPorId } from '@/tools/registry';
import { GeneradorRifas } from '@/tools/rifas/GeneradorRifas';

// La herramienta sigue las mismas reglas que cualquier otra del registro: el rol se
// revalida aquí, en el servidor (§Fase 6).

export default async function PantallaRifas() {
  const sesion = await requerirSesion();

  const herramienta = herramientaPorId('rifas');
  if (!herramienta) notFound();
  if (!herramienta.roles.includes(sesion.rol)) forbidden();

  return (
    <section>
      <EncabezadoPantalla titulo={herramienta.nombre} descripcion={herramienta.descripcion} />
      <GeneradorRifas />
    </section>
  );
}
