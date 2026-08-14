import Link from 'next/link';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Distintivo } from '@/components/ui/Distintivo';
import { clases } from '@/lib/clases';
import { requerirSesion } from '@/lib/sesion';
import { herramientasDe, type Herramienta } from '@/tools/registry';

// La vitrina. Lista las tarjetas filtradas por el rol de la sesión, con las de estado
// `proxima` atenuadas y sin enlace (§Fase 6).

export default async function Vitrina() {
  const sesion = await requerirSesion();
  const herramientas = herramientasDe(sesion.rol);

  return (
    <section>
      <EncabezadoPantalla
        titulo="Herramientas"
        descripcion="Utilidades del mostrador. Esta sección va a ir creciendo."
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {herramientas.map((herramienta) => (
          <li key={herramienta.id}>
            <Tarjeta herramienta={herramienta} />
          </li>
        ))}
      </ul>

      {herramientas.length === 0 && (
        <p className="border border-linea bg-white p-6 text-center text-base text-grafito">
          Todavía no hay herramientas para tu rol.
        </p>
      )}
    </section>
  );
}

function Tarjeta({ herramienta }: { herramienta: Herramienta }) {
  const Icono = herramienta.icono;
  const proxima = herramienta.estado === 'proxima';

  const contenido = (
    <>
      <span className={clases('text-tinta', proxima && 'text-grafito-claro')}>
        <Icono />
      </span>
      <span className="mt-3 flex items-center gap-2">
        <span className="font-display text-cuerpo font-semibold text-tinta">
          {herramienta.nombre}
        </span>
        {herramienta.estado === 'beta' && <Distintivo tono="marcador">Beta</Distintivo>}
        {proxima && <Distintivo>Próxima</Distintivo>}
      </span>
      <span className="mt-1 block text-base text-grafito">{herramienta.descripcion}</span>
    </>
  );

  // Las `proxima` no son clicables: ni enlace ni botón, solo un bloque atenuado. Un enlace
  // deshabilitado con el cursor cambiado seguiría siendo navegable con teclado.
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
      href={herramienta.ruta}
      className="block h-full border border-linea-fuerte bg-white p-4 shadow-impresa transition-colors duration-avance hover:bg-papel-hondo"
    >
      {contenido}
    </Link>
  );
}
