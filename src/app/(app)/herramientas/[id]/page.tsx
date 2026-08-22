import Link from 'next/link';
import { forbidden, notFound } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { requerirSesion } from '@/lib/sesion';
import { herramientaPorId, nombreDe, descripcionDe } from '@/tools/registry';

// El filtrado por rol se repite AQUÍ, en el servidor: la vitrina esconde, el servidor
// bloquea (§Fase 6). Entrar escribiendo la URL no sirve de nada.

export default async function PantallaHerramienta({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();
  const { id } = await params;

  const herramienta = herramientaPorId(id);
  if (!herramienta) notFound();
  if (!herramienta.roles.includes(sesion.rol)) forbidden();

  // Cada herramienta con interfaz propia vive en su carpeta y se monta en su lugar. Las
  // que aún no existen caen aquí, que es lo honesto: la tarjeta ya lo decía.
  return (
    <section>
      <EncabezadoPantalla titulo={nombreDe(id, idioma)} descripcion={descripcionDe(id, idioma)} />

      <div className="border border-linea-fuerte bg-white p-6 shadow-impresa">
        <p className="text-cuerpo text-tinta">{t(idioma, 'herramientas.aunNoConstruida')}</p>
        <Link href="/herramientas" className="mt-4 inline-block text-boligrafo underline">
          {t(idioma, 'herramientas.volverAHerramientas')}
        </Link>
      </div>
    </section>
  );
}
