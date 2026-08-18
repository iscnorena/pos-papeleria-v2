import Link from 'next/link';

import { POS } from '@/config/pos';
import { idsPublicosEntre } from '@/lib/toolSettings';
import { subHerramientasPdfListas } from '@/tools/pdf/registro';
import { herramientasConVersionPublica } from '@/tools/registry';

// Índice de herramientas gratuitas, sin sesión. Candidatas por `rutaPublica` en el
// registro, pero la lista final la decide `tool_settings` (el interruptor que cada admin
// prende/apaga desde la pantalla de esa herramienta en /herramientas) — así que esto
// tiene que consultar la base, no basta con filtrar el registro estático.
//
// El grupo "pdf" es especial: no tiene su propio interruptor, aparece si al menos una
// sub-herramienta de PDF (Unir, etc.) está pública.

export default async function ImprimirPage() {
  const candidatas = herramientasConVersionPublica();
  const idsPublicos = await idsPublicosEntre(candidatas.map((h) => h.id));

  const subsPdfListas = subHerramientasPdfListas();
  const idsPdfPublicos = await idsPublicosEntre(subsPdfListas.map((s) => s.id));

  const herramientas = candidatas.filter((h) =>
    h.id === 'pdf' ? idsPdfPublicos.size > 0 : idsPublicos.has(h.id),
  );

  return (
    <main className="min-h-dvh bg-papel pb-10">
      <header className="border-b border-linea-fuerte bg-white px-4 py-3">
        <h1 className="font-display text-cuerpo font-semibold text-tinta">{POS.nombreNegocio}</h1>
        <p className="text-fino text-grafito">Herramientas gratis, sin necesidad de cuenta</p>
      </header>

      <ul className="mx-auto flex max-w-md flex-col gap-3 px-4 py-5">
        {herramientas.map((h) => {
          const Icono = h.icono;
          return (
            <li key={h.id}>
              <Link
                href={h.rutaPublica!}
                className="flex items-center gap-3 border border-linea-fuerte bg-white p-4 shadow-impresa transition-colors duration-avance hover:bg-papel-hondo"
              >
                <span className="text-tinta">
                  <Icono />
                </span>
                <span>
                  <span className="block font-display text-cuerpo font-semibold text-tinta">
                    {h.nombre}
                  </span>
                  <span className="block text-fino text-grafito">{h.descripcion}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {herramientas.length === 0 && (
        <p className="mx-auto max-w-md px-4 text-center text-base text-grafito">
          Por el momento no hay herramientas disponibles.
        </p>
      )}
    </main>
  );
}
