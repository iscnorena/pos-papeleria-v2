import { notFound } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { InterruptorPublico } from '@/components/InterruptorPublico';
import { obtenerIdioma } from '@/lib/i18n/servidor';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { requerirSesion } from '@/lib/sesion';
import { DividirPdf } from '@/tools/pdf/DividirPdf';
import { subHerramientaPdfPorId, nombreSubDe, descripcionSubDe } from '@/tools/pdf/registro';

// A diferencia del registro principal, las sub-herramientas de PDF no tienen roles
// propios: cualquiera con sesión (admin o cajera) que pueda ver "Herramientas de PDF"
// puede usarlas — el control de rol ya ocurrió al entrar a /herramientas/pdf.

export default async function PantallaDividirPdf() {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();

  const sub = subHerramientaPdfPorId('dividir');
  if (!sub) notFound();

  const publica = await esHerramientaPublica('dividir');

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPantalla
        titulo={nombreSubDe('dividir', idioma)}
        descripcion={descripcionSubDe('dividir', idioma)}
      />
      {sesion.rol === 'admin' && (
        <InterruptorPublico id="dividir" publicaInicial={publica} rutaPublica={sub.rutaPublica} />
      )}
      <DividirPdf />
    </section>
  );
}
