'use client';

import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

import { clases } from '@/lib/clases';

export type OpcionSelector = { valor: string; texto: string };

export type SelectorProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  etiqueta: string;
  opciones: OpcionSelector[];
  error?: string | undefined;
  vacio?: string;
};

export function Selector({ etiqueta, opciones, error, vacio, className, ...props }: SelectorProps) {
  const id = useId();
  const idError = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-fino font-medium text-tinta">
        {etiqueta}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        className={clases(
          'min-h-[2.5rem] w-full border bg-white px-3 text-cuerpo text-tinta',
          error ? 'border-sello' : 'border-linea-fuerte',
          className,
        )}
        {...props}
      >
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {error && (
        <p id={idError} className="text-fino text-sello">
          {error}
        </p>
      )}
    </div>
  );
}
