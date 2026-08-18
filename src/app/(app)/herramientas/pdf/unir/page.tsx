import { notFound } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { InterruptorPublico } from '@/components/InterruptorPublico';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { requerirSesion } from '@/lib/sesion';
import { subHerramientaPdfPorId } from '@/tools/pdf/registro';
import { UnirPdf } from '@/tools/pdf/UnirPdf';

// A diferencia del registro principal, las sub-herramientas de PDF no tienen roles
// propios: cualquiera con sesión (admin o cajera) que pueda ver "Herramientas de PDF"
// puede usarlas — el control de rol ya ocurrió al entrar a /herramientas/pdf.

export default async function PantallaUnirPdf() {
  const sesion = await requerirSesion();

  const sub = subHerramientaPdfPorId('unir');
  if (!sub) notFound();

  const publica = await esHerramientaPublica('unir');

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPantalla titulo={sub.nombre} descripcion={sub.descripcion} />
      {sesion.rol === 'admin' && (
        <InterruptorPublico id="unir" publicaInicial={publica} rutaPublica={sub.rutaPublica} />
      )}
      <UnirPdf />
    </section>
  );
}
