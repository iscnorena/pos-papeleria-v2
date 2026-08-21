import type { Metadata } from 'next';

import { SelectorTema } from '@/components/ui/SelectorTema';
import { POS } from '@/config/pos';
import { FormularioLogin } from './FormularioLogin';

export const metadata: Metadata = { title: `Entrar · ${POS.nombreNegocio}` };

// La primera cara del sistema de diseño (§ Fase 1): fondo `papel`, tarjeta con
// `shadow-impresa` y borde `linea-fuerte`, el nombre del negocio en `display`.

export default async function PaginaLogin({
  searchParams,
}: {
  // En Next 16 `searchParams` es una promesa: el acceso síncrono se eliminó.
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const { siguiente } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <p className="font-mono text-micro uppercase text-grafito-claro">Punto de venta</p>
          <h1 className="mt-1 font-display text-titulo font-semibold text-tinta">
            {POS.nombreNegocio}
          </h1>
        </header>

        <FormularioLogin siguiente={siguiente ?? ''} />

        <p className="mt-6 text-center text-fino text-grafito-claro">
          Entra con tu usuario o con tu PIN de turno.
        </p>

        <div className="mt-4 flex justify-center">
          <SelectorTema />
        </div>
      </div>
    </main>
  );
}
