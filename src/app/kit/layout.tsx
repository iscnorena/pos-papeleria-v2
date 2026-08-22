import Link from 'next/link';
import type { Metadata } from 'next';

import { SelectorIdioma } from '@/components/ui/SelectorIdioma';
import { SelectorTema } from '@/components/ui/SelectorTema';
import { POS } from '@/config/pos';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';

// Layout compartido de la sección pública /kit (sin sesión). Dueño de min-h-dvh y
// bg-papel: las páginas hijas ya no declaran ninguno de los dos, para no duplicar el
// alto de viewport. No lleva `dynamic = 'force-dynamic'` propio — no consulta nada
// dinámico; el que sí lo necesita es cada page.tsx que consulta `tool_settings` (ver
// comentario en esas páginas), y Next renderiza el árbol completo dinámico cuando
// cualquier segmento hijo lo exige.
export const metadata: Metadata = {
  title: {
    template: `%s · ${POS.nombreNegocio}`,
    default: `Herramientas · ${POS.nombreNegocio}`,
  },
  description: 'Herramientas gratis para imprimir, sin necesidad de cuenta.',
};

export default async function LayoutImprimir({ children }: { children: React.ReactNode }) {
  const idioma = await obtenerIdioma();

  return (
    <div className="flex min-h-dvh flex-col bg-papel">
      <header className="border-b border-linea-fuerte bg-white px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link href="/kit" className="inline-block">
            <p className="font-display text-cuerpo font-semibold text-tinta">{POS.nombreNegocio}</p>
            <p className="font-mono text-micro uppercase text-grafito-claro">
              {t(idioma, 'kit.eslogan')}
            </p>
          </Link>
          <div className="flex items-center gap-2">
            <SelectorIdioma />
            <SelectorTema />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-linea-fuerte px-4 py-3 text-center">
        <Link
          href="/kit/privacidad"
          className="font-mono text-micro uppercase text-grafito-claro hover:text-tinta"
        >
          {t(idioma, 'kit.avisoPrivacidad')}
        </Link>
      </footer>
    </div>
  );
}
