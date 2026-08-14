'use client';

import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

import { clases } from '@/lib/clases';

// Campo = etiqueta + input + error. El error va pegado al campo que falla, no en un
// resumen arriba: el criterio 1 de la Fase 2 pide «validación visible en el campo que falla».

export type CampoProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string;
};

export function Campo({ etiqueta, error, ayuda, className, ...props }: CampoProps) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-fino font-medium text-tinta">
        {etiqueta}
      </label>

      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={clases(error && idError, ayuda && idAyuda) || undefined}
        className={clases(
          'min-h-[2.5rem] w-full border bg-white px-3 text-cuerpo text-tinta',
          'placeholder:text-grafito-claro',
          error ? 'border-sello' : 'border-linea-fuerte',
          className,
        )}
        {...props}
      />

      {ayuda && !error && (
        <p id={idAyuda} className="text-fino text-grafito">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-fino text-sello">
          {error}
        </p>
      )}
    </div>
  );
}
