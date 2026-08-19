import Link from 'next/link';
import type { ComponentType } from 'react';

// Lista de tarjetas de herramientas para los índices públicos (/imprimir e
// /imprimir/pdf) — antes duplicada letra por letra entre esas dos páginas. Las dos
// fuentes de datos (registro principal y sub-registro de PDF) tienen forma distinta;
// cada página adapta la suya a `ItemIndicePublico` antes de pasarla aquí.
//
// Tratamiento "boletos perforados": una sola tarjeta contenedora, cortada por una línea
// punteada entre cada herramienta (`divide-dashed`) en vez de N tarjetas sueltas — el
// único elemento de riesgo visual nuevo en la sección pública, coherente con que el
// negocio vende justamente impresión de boletos/rifas.

export type ItemIndicePublico = {
  id: string;
  nombre: string;
  descripcion: string;
  icono: ComponentType;
  rutaPublica: string;
};

export function IndiceHerramientasPublico({
  items,
  mensajeVacio,
}: {
  items: ItemIndicePublico[];
  mensajeVacio: string;
}) {
  if (items.length === 0) {
    return <p className="text-center text-base text-grafito">{mensajeVacio}</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-dashed divide-linea-fuerte border border-linea-fuerte bg-white shadow-impresa">
      {items.map((item) => {
        const Icono = item.icono;
        return (
          <li key={item.id}>
            <Link
              href={item.rutaPublica}
              className="flex items-center gap-3 p-4 transition-colors duration-avance hover:bg-papel-hondo"
            >
              <span className="text-tinta">
                <Icono />
              </span>
              <span>
                <span className="block font-display text-cuerpo font-semibold text-tinta">
                  {item.nombre}
                </span>
                <span className="block text-fino text-grafito">{item.descripcion}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
