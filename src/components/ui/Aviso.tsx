import type { ReactNode } from 'react';

import { clases } from '@/lib/clases';

type Tono = 'error' | 'exito' | 'neutro';

const TONOS: Record<Tono, string> = {
  error: 'border-sello bg-sello-tenue text-sello-hondo',
  exito: 'border-visto bg-visto-tenue text-visto-hondo',
  neutro: 'border-linea-fuerte bg-papel-hondo text-tinta',
};

export function Aviso({
  tono = 'neutro',
  children,
  className,
}: {
  tono?: Tono;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      // `alert` hace que el lector de pantalla lo anuncie al aparecer, que es justo lo que
      // se necesita para un error de login que surge después de enviar el formulario.
      role={tono === 'error' ? 'alert' : undefined}
      className={clases('border px-3 py-2 text-base', TONOS[tono], className)}
    >
      {children}
    </p>
  );
}
