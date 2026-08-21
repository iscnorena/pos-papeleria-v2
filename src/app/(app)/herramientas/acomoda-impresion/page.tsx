import { forbidden, notFound } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { InterruptorPublico } from '@/components/InterruptorPublico';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { requerirSesion } from '@/lib/sesion';
import { herramientaPorId } from '@/tools/registry';
import { AcomodaImpresion } from './AcomodaImpresion';

// La herramienta sigue las mismas reglas que cualquier otra del registro: el rol se
// revalida aquí, en el servidor (§Fase 6).
//
// Todo lo demás ocurre en el navegador (§6): las imágenes se leen con `FileReader`, la
// vista previa es HTML posicionado y el PDF se arma con pdf-lib. Ninguna imagen sube.

export default async function PantallaAcomodaImpresion() {
  const sesion = await requerirSesion();

  const herramienta = herramientaPorId('acomoda-impresion');
  if (!herramienta) notFound();
  if (!herramienta.roles.includes(sesion.rol)) forbidden();

  const publica = await esHerramientaPublica('acomoda-impresion');

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPantalla titulo={herramienta.nombre} descripcion={herramienta.descripcion} />
      {sesion.rol === 'admin' && (
        <InterruptorPublico
          id="acomoda-impresion"
          publicaInicial={publica}
          rutaPublica="/kit/acomoda-impresion"
        />
      )}
      <AcomodaImpresion />
    </section>
  );
}
