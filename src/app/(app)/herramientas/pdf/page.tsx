import Link from 'next/link';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Distintivo } from '@/components/ui/Distintivo';
import { clases } from '@/lib/clases';
import { requerirSesion } from '@/lib/sesion';
import { herramientaPorId } from '@/tools/registry';
import { HERRAMIENTAS_PDF, type SubHerramientaPdf } from '@/tools/pdf/registro';

// Mini-vitrina de "Herramientas de PDF" (mismo patrón que /herramientas, un nivel más
// abajo): cada sub-herramienta vive en su propia subruta /herramientas/pdf/<id>. Se
// arma solo con `estado` — no hace falta filtrar por rol aquí, ya lo hizo la vitrina
// principal al mostrar la tarjeta "Herramientas de PDF".

export default async function VitrinaPdf() {
  await requerirSesion();
  const herramienta = herramientaPorId('pdf');

  return (
    <section>
      <EncabezadoPantalla
        titulo={herramienta?.nombre ?? 'Herramientas de PDF'}
        descripcion="Vamos a ir agregando una por una."
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HERRAMIENTAS_PDF.map((sub) => (
          <li key={sub.id}>
            <TarjetaPdf sub={sub} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TarjetaPdf({ sub }: { sub: SubHerramientaPdf }) {
  const Icono = sub.icono;
  const proxima = sub.estado === 'proxima';

  const contenido = (
    <>
      <span className={clases('text-tinta', proxima && 'text-grafito-claro')}>
        <Icono />
      </span>
      <span className="mt-3 flex items-center gap-2">
        <span className="font-display text-cuerpo font-semibold text-tinta">{sub.nombre}</span>
        {proxima && <Distintivo>Próxima</Distintivo>}
      </span>
      <span className="mt-1 block text-base text-grafito">{sub.descripcion}</span>
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
