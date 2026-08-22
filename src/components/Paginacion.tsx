import Link from 'next/link';
import type { ReactNode } from 'react';

import { PAGINACION } from '@/config/pos';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { totalDePaginas } from '@/lib/paginacion';

/**
 * Anterior/Siguiente por GET, como el resto de los filtros del sistema: la página queda en
 * la URL. `parametros` son los DEMÁS filtros activos de la pantalla (búsqueda, sucursal,
 * estado…) — se preservan al cambiar de página, igual que `FiltrosFecha` los preserva al
 * enviar el formulario.
 */
export async function Paginacion({
  ruta,
  parametros = {},
  pagina,
  totalFilas,
  porPagina = PAGINACION.porPagina,
}: {
  ruta: string;
  parametros?: Record<string, string | undefined>;
  pagina: number;
  totalFilas: number;
  porPagina?: number;
}) {
  const paginas = totalDePaginas(totalFilas, porPagina);
  if (paginas <= 1) return null;
  const idioma = await obtenerIdioma();

  function href(destino: number): string {
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(parametros)) {
      if (valor) params.set(clave, valor);
    }
    params.set('pagina', String(destino));
    return `${ruta}?${params.toString()}`;
  }

  return (
    <nav
      aria-label={t(idioma, 'paginacion.etiqueta')}
      className="mt-4 flex items-center justify-between gap-3 border-t border-linea pt-3"
    >
      <EnlacePagina href={href(pagina - 1)} deshabilitado={pagina <= 1}>
        {t(idioma, 'paginacion.anterior')}
      </EnlacePagina>
      <span className="font-mono text-micro uppercase text-grafito-claro">
        {t(idioma, 'paginacion.resumen', { pagina, paginas, total: totalFilas })}
      </span>
      <EnlacePagina href={href(pagina + 1)} deshabilitado={pagina >= paginas}>
        {t(idioma, 'paginacion.siguiente')}
      </EnlacePagina>
    </nav>
  );
}

function EnlacePagina({
  href,
  deshabilitado,
  children,
}: {
  href: string;
  deshabilitado: boolean;
  children: ReactNode;
}) {
  if (deshabilitado) {
    return (
      <span className="text-fino text-grafito-claro" aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="text-fino text-boligrafo underline">
      {children}
    </Link>
  );
}
