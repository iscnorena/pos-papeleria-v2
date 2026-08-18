import Link from 'next/link';

import { POS } from '@/config/pos';
import { herramientasPublicas } from '@/tools/registry';

// Índice de herramientas gratuitas, sin sesión. Crece según se agreguen `rutaPublica` al
// registro (§Fase 6 extendido) — no hay nada que tocar aquí al sumar una herramienta más.

export default function ImprimirPage() {
  const herramientas = herramientasPublicas();

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
    </main>
  );
}
