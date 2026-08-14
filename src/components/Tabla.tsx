import type { ReactNode } from 'react';

import { clases } from '@/lib/clases';

// Libro rayado: filas de altura `renglon`, filetes finos, sin sombras ni esquinas redondas.

export function Tabla({ encabezados, children }: { encabezados: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-linea-fuerte bg-white shadow-impresa">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="border-b border-linea-fuerte bg-papel-hondo text-left">
            {encabezados.map((h) => (
              <th key={h} className="px-3 py-2 font-mono text-micro uppercase text-grafito">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Fila({
  children,
  resaltada = false,
}: {
  children: ReactNode;
  resaltada?: boolean;
}) {
  return (
    <tr
      className={clases(
        'border-b border-linea last:border-b-0',
        resaltada ? 'bg-sello-tenue' : 'bg-white',
      )}
    >
      {children}
    </tr>
  );
}

export function Celda({
  children,
  className,
  mono = false,
}: {
  children: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={clases(
        'min-h-renglon px-3 py-2 align-middle text-tinta',
        mono && 'tabular font-mono',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function SinDatos({ columnas, children }: { columnas: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columnas} className="px-3 py-8 text-center text-base text-grafito">
        {children}
      </td>
    </tr>
  );
}
