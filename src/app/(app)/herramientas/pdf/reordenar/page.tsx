import { notFound } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { InterruptorPublico } from '@/components/InterruptorPublico';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { requerirSesion } from '@/lib/sesion';
import { ReordenarPdf } from '@/tools/pdf/ReordenarPdf';
import { subHerramientaPdfPorId } from '@/tools/pdf/registro';

// A diferencia del registro principal, las sub-herramientas de PDF no tienen roles
// propios: cualquiera con sesión (admin o cajera) que pueda ver "Herramientas de PDF"
// puede usarlas — el control de rol ya ocurrió al entrar a /herramientas/pdf.

export default async function PantallaReordenarPdf() {
  const sesion = await requerirSesion();

  const sub = subHerramientaPdfPorId('reordenar');
  if (!sub) notFound();

  const publica = await esHerramientaPublica('reordenar');

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPantalla titulo={sub.nombre} descripcion={sub.descripcion} />
      {sesion.rol === 'admin' && (
        <InterruptorPublico id="reordenar" publicaInicial={publica} rutaPublica={sub.rutaPublica} />
      )}
      <ReordenarPdf />
    </section>
  );
}
