'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { clases } from '@/lib/clases';

// El renglón activo se marca con un filete grueso a la izquierda, como una pestaña de
// archivador. Nada de fondos de color: el `marcador` está reservado (§4).

export function EnlaceNav({ href, children }: { href: string; children: ReactNode }) {
  const ruta = usePathname();
  const activo = ruta === href || ruta.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={activo ? 'page' : undefined}
      className={clases(
        'block border-l-2 py-1.5 pl-3 text-base transition-colors duration-avance',
        activo
          ? 'border-boligrafo font-medium text-tinta'
          : 'border-transparent text-grafito hover:border-linea-fuerte hover:text-tinta',
      )}
    >
      {children}
    </Link>
  );
}
