import type { ReactNode } from 'react';

import { clases } from '@/lib/clases';

// Distintivo = sello de goma. Mayúsculas, `mono`, borde seco.

type Tono = 'visto' | 'sello' | 'neutro' | 'marcador';

const TONOS: Record<Tono, string> = {
  visto: 'border-visto bg-visto-tenue text-visto-hondo',
  sello: 'border-sello bg-sello-tenue text-sello-hondo',
  neutro: 'border-linea-fuerte bg-papel-hondo text-grafito',
  marcador: 'border-marcador-hondo bg-marcador-tenue text-tinta',
};

export function Distintivo({
  tono = 'neutro',
  children,
  className,
}: {
  tono?: Tono;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clases(
        'inline-block border px-1.5 py-0.5 font-mono text-micro uppercase',
        TONOS[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}
