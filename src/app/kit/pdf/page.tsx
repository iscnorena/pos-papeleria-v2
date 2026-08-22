import type { Metadata } from 'next';

import { CabeceraPublica } from '@/components/CabeceraPublica';
import {
  IndiceHerramientasPublico,
  type ItemIndicePublico,
} from '@/components/IndiceHerramientasPublico';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { idsPrivadosEntre } from '@/lib/toolSettings';
import { nombreSubDe, descripcionSubDe, subHerramientasPdfListas } from '@/tools/pdf/registro';

// Índice público de "Herramientas de PDF", sin sesión — cuelga de /kit. Mismo
// criterio que el índice principal: pública por defecto, cada sub-herramienta desaparece
// solo si su interruptor en `tool_settings` se apagó a mano.
//
// `force-dynamic`: ver el comentario en ../page.tsx — sin esto, `revalidatePath` no
// siempre gana la carrera contra el Full Route Cache de Vercel.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Herramientas de PDF' };

export default async function ImprimirPdfPage() {
  const idioma = await obtenerIdioma();
  const listas = subHerramientasPdfListas();
  const idsPrivados = await idsPrivadosEntre(listas.map((s) => s.id));
  const disponibles = listas.filter((s) => !idsPrivados.has(s.id));

  const items: ItemIndicePublico[] = disponibles.map((s) => ({
    id: s.id,
    nombre: nombreSubDe(s.id, idioma),
    descripcion: descripcionSubDe(s.id, idioma),
    icono: s.icono,
    rutaPublica: s.rutaPublica,
  }));

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-5">
      <CabeceraPublica
        titulo={t(idioma, 'herramientas.nombrePdf')}
        volver={{ href: '/kit', texto: t(idioma, 'nav.herramientas') }}
      />
      <IndiceHerramientasPublico
        items={items}
        mensajeVacio={t(idioma, 'herramientas.sinPdfDisponiblesPublico')}
      />
    </div>
  );
}
