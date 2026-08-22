import { CabeceraPublica } from '@/components/CabeceraPublica';
import {
  IndiceHerramientasPublico,
  type ItemIndicePublico,
} from '@/components/IndiceHerramientasPublico';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { idsPrivadosEntre } from '@/lib/toolSettings';
import { subHerramientasPdfListas } from '@/tools/pdf/registro';
import { herramientasConVersionPublica, nombreDe, descripcionDe } from '@/tools/registry';

// Índice de herramientas gratuitas, sin sesión. Candidatas por `rutaPublica` en el
// registro, pero la lista final la decide `tool_settings` (el interruptor que cada admin
// prende/apaga desde la pantalla de esa herramienta en /herramientas) — así que esto
// tiene que consultar la base, no basta con filtrar el registro estático. Pública por
// defecto: solo se excluye la que el admin apagó a mano (ver `toolSettings.ts`).
//
// El grupo "pdf" es especial: no tiene su propio interruptor, aparece si al menos una
// sub-herramienta de PDF (Unir, etc.) NO está apagada.
//
// `force-dynamic`: sin esto, Vercel puede servir esta página desde el Full Route Cache y
// `revalidatePath` (en la Server Action del interruptor) no siempre la invalida a tiempo
// — se vio en producción que el checkbox cambiaba en la base pero el índice seguía
// mostrando la lista vieja. Es una pantalla de bajo tráfico; la corrección importa más
// que el ahorro de cachearla.
export const dynamic = 'force-dynamic';

export default async function ImprimirPage() {
  const idioma = await obtenerIdioma();
  const candidatas = herramientasConVersionPublica();
  const idsPrivados = await idsPrivadosEntre(candidatas.map((h) => h.id));

  const subsPdfListas = subHerramientasPdfListas();
  const idsPdfPrivados = await idsPrivadosEntre(subsPdfListas.map((s) => s.id));

  const herramientas = candidatas.filter((h) =>
    h.id === 'pdf' ? subsPdfListas.some((s) => !idsPdfPrivados.has(s.id)) : !idsPrivados.has(h.id),
  );

  const items: ItemIndicePublico[] = herramientas.map((h) => ({
    id: h.id,
    nombre: nombreDe(h.id, idioma),
    descripcion: descripcionDe(h.id, idioma),
    icono: h.icono,
    rutaPublica: h.rutaPublica!,
  }));

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-5">
      <CabeceraPublica titulo={t(idioma, 'herramientas.tituloGratis')} />
      <IndiceHerramientasPublico
        items={items}
        mensajeVacio={t(idioma, 'herramientas.sinDisponiblesPublico')}
      />
    </div>
  );
}
