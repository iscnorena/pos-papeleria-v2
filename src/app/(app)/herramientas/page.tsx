import Link from 'next/link';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Distintivo } from '@/components/ui/Distintivo';
import { obtenerIdioma, t, type Idioma } from '@/lib/i18n/servidor';
import { clases } from '@/lib/clases';
import { requerirSesion } from '@/lib/sesion';
import { herramientasDe, nombreDe, descripcionDe, type Herramienta } from '@/tools/registry';

// La vitrina. Lista las tarjetas filtradas por el rol de la sesión, con las de estado
// `proxima` atenuadas y sin enlace (§Fase 6).

export default async function Vitrina() {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();
  const herramientas = herramientasDe(sesion.rol);

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'nav.herramientas')}
        descripcion={t(idioma, 'herramientas.descripcionVitrina')}
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {herramientas.map((herramienta) => (
          <li key={herramienta.id}>
            <Tarjeta herramienta={herramienta} idioma={idioma} />
          </li>
        ))}
      </ul>

      {herramientas.length === 0 && (
        <p className="border border-linea bg-white p-6 text-center text-base text-grafito">
          {t(idioma, 'herramientas.sinHerramientasParaRol')}
        </p>
      )}
    </section>
  );
}

function Tarjeta({ herramienta, idioma }: { herramienta: Herramienta; idioma: Idioma }) {
  const Icono = herramienta.icono;
  const proxima = herramienta.estado === 'proxima';

  const contenido = (
    <>
      <span className={clases('text-tinta', proxima && 'text-grafito-claro')}>
        <Icono />
      </span>
      <span className="mt-3 flex items-center gap-2">
        <span className="font-display text-cuerpo font-semibold text-tinta">
          {nombreDe(herramienta.id, idioma)}
        </span>
        {herramienta.estado === 'beta' && (
          <Distintivo tono="marcador">{t(idioma, 'herramientas.beta')}</Distintivo>
        )}
        {proxima && <Distintivo>{t(idioma, 'herramientas.proxima')}</Distintivo>}
      </span>
      <span className="mt-1 block text-base text-grafito">
        {descripcionDe(herramienta.id, idioma)}
      </span>
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
