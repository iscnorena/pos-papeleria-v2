import { forbidden, notFound } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { InterruptorPublico } from '@/components/InterruptorPublico';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { requerirSesion } from '@/lib/sesion';
import { herramientaPorId } from '@/tools/registry';
import { GeneradorLibreta } from '@/tools/libreta/GeneradorLibreta';

// La herramienta sigue las mismas reglas que cualquier otra del registro: el rol se
// revalida aquí, en el servidor (§Fase 6).

export default async function PantallaLibreta() {
  const sesion = await requerirSesion();

  const herramienta = herramientaPorId('libreta');
  if (!herramienta) notFound();
  if (!herramienta.roles.includes(sesion.rol)) forbidden();

  const publica = await esHerramientaPublica('libreta');

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPantalla titulo={herramienta.nombre} descripcion={herramienta.descripcion} />
      {sesion.rol === 'admin' && (
        <InterruptorPublico id="libreta" publicaInicial={publica} rutaPublica="/imprimir/libreta" />
      )}
      <GeneradorLibreta />
    </section>
  );
}
