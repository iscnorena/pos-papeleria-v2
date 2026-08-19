import { notFound } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { InterruptorPublico } from '@/components/InterruptorPublico';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { requerirSesion } from '@/lib/sesion';
import { NumerarPdf } from '@/tools/pdf/NumerarPdf';
import { subHerramientaPdfPorId } from '@/tools/pdf/registro';

// A diferencia del registro principal, las sub-herramientas de PDF no tienen roles
// propios: cualquiera con sesión (admin o cajera) que pueda ver "Herramientas de PDF"
// puede usarlas — el control de rol ya ocurrió al entrar a /herramientas/pdf.

export default async function PantallaNumerarPdf() {
  const sesion = await requerirSesion();

  const sub = subHerramientaPdfPorId('numerar');
  if (!sub) notFound();

  const publica = await esHerramientaPublica('numerar');

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPantalla titulo={sub.nombre} descripcion={sub.descripcion} />
      {sesion.rol === 'admin' && (
        <InterruptorPublico id="numerar" publicaInicial={publica} rutaPublica={sub.rutaPublica} />
      )}
      <NumerarPdf />
    </section>
  );
}
