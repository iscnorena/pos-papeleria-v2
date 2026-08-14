import type { ReactNode } from 'react';

export function EncabezadoPantalla({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-linea-fuerte pb-3">
      <div>
        <h1 className="font-display text-titulo font-semibold text-tinta">{titulo}</h1>
        {descripcion && <p className="mt-1 text-base text-grafito">{descripcion}</p>}
      </div>
      {children}
    </header>
  );
}
