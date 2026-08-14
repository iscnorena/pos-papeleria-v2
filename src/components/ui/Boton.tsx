import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { clases } from '@/lib/clases';

// §4: tres variantes y nada más. Radio casi cero y sombra sin difuminado — es papel
// cortado y tinta impresa, no una tarjeta de software.

type Variante = 'primaria' | 'secundaria' | 'destructiva';
type Tamano = 'normal' | 'tecla';

const VARIANTES: Record<Variante, string> = {
  primaria: 'bg-boligrafo text-white border-boligrafo-hondo hover:bg-boligrafo-hondo',
  secundaria: 'bg-white text-tinta border-linea-fuerte hover:bg-papel-hondo',
  destructiva: 'bg-sello text-white border-sello-hondo hover:bg-sello-hondo',
};

const TAMANOS: Record<Tamano, string> = {
  normal: 'min-h-[2.5rem] px-4 text-base',
  tecla: 'min-h-tecla px-4 text-cuerpo',
};

export type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
  children: ReactNode;
};

export function Boton({
  variante = 'primaria',
  tamano = 'normal',
  className,
  type = 'button',
  ...props
}: BotonProps) {
  return (
    <button
      type={type}
      className={clases(
        'inline-flex items-center justify-center gap-2 border font-medium',
        'shadow-impresa transition-colors duration-avance',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        VARIANTES[variante],
        TAMANOS[tamano],
        className,
      )}
      {...props}
    />
  );
}
