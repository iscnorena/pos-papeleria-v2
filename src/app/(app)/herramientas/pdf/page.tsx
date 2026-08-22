import Link from 'next/link';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Distintivo } from '@/components/ui/Distintivo';
import { obtenerIdioma, t, type Idioma } from '@/lib/i18n/servidor';
import { clases } from '@/lib/clases';
import { requerirSesion } from '@/lib/sesion';
import { herramientaPorId, nombreDe } from '@/tools/registry';
import {
  HERRAMIENTAS_PDF,
  nombreSubDe,
  descripcionSubDe,
  type SubHerramientaPdf,
} from '@/tools/pdf/registro';

// Mini-vitrina de "Herramientas de PDF" (mismo patrón que /herramientas, un nivel más
// abajo): cada sub-herramienta vive en su propia subruta /herramientas/pdf/<id>. Se
// arma solo con `estado` — no hace falta filtrar por rol aquí, ya lo hizo la vitrina
// principal al mostrar la tarjeta "Herramientas de PDF".

export default async function VitrinaPdf() {
  await requerirSesion();
  const idioma = await obtenerIdioma();
  const herramienta = herramientaPorId('pdf');

  return (
    <section>
      <EncabezadoPantalla
        titulo={herramienta ? nombreDe('pdf', idioma) : t(idioma, 'herramientas.nombrePdf')}
        descripcion={t(idioma, 'herramientas.vamosAgregando')}
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HERRAMIENTAS_PDF.map((sub) => (
          <li key={sub.id}>
            <TarjetaPdf sub={sub} idioma={idioma} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TarjetaPdf({ sub, idioma }: { sub: SubHerramientaPdf; idioma: Idioma }) {
  const Icono = sub.icono;
  const proxima = sub.estado === 'proxima';

  const contenido = (
    <>
      <span className={clases('text-tinta', proxima && 'text-grafito-claro')}>
        <Icono />
      </span>
      <span className="mt-3 flex items-center gap-2">
        <span className="font-display text-cuerpo font-semibold text-tinta">
          {nombreSubDe(sub.id, idioma)}
        </span>
        {proxima && <Distintivo>{t(idioma, 'herramientas.proxima')}</Distintivo>}
      </span>
      <span className="mt-1 block text-base text-grafito">{descripcionSubDe(sub.id, idioma)}</span>
    </>
  );

  if (proxima) {
    return (
      <div
        aria-disabled="true"
        className="block h-full border border-linea bg-white p-4 opacity-60 shadow-impresa"
      >
        {contenido}
      </div>
    );
  }

  return (
    <Link
      href={sub.ruta}
      className="block h-full border border-linea-fuerte bg-white p-4 shadow-impresa transition-colors duration-avance hover:bg-papel-hondo"
    >
      {contenido}
    </Link>
  );
}
