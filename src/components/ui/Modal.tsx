'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

// Modal sobre `<dialog>` nativo: trae gratis el foco atrapado, el fondo inerte y el cierre
// con Esc, que a mano siempre sale peor. §4 pide que Esc cierre cualquier modal.

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (abierto && !elemento.open) elemento.showModal();
    if (!abierto && elemento.open) elemento.close();
  }, [abierto]);

  return (
    <dialog
      ref={dialogo}
      onClose={onCerrar}
      // `cancel` es el evento de Esc. Se deja pasar, pero avisando al padre.
      onCancel={onCerrar}
      aria-labelledby="titulo-modal"
      className="w-full max-w-md border border-linea-fuerte bg-white p-0 text-tinta shadow-alzada backdrop:bg-tinta/40"
    >
      <div className="border-b border-linea px-5 py-3">
        <h2 id="titulo-modal" className="font-display text-cuerpo font-semibold">
          {titulo}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
