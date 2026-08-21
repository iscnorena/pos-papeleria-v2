'use client';

import { useLayoutEffect, useState } from 'react';

import {
  aplicarTema,
  guardarTema,
  leerTemaGuardado,
  TEMA_POR_DEFECTO,
  type Tema,
} from '@/lib/tema';
import { IconoEscaner, IconoPluma } from '@/tools/iconos';

// Selector permanente entre las dos identidades visuales del sistema (Clásico/Moderno,
// ver src/app/globals.css). El script anti-parpadeo de src/app/layout.tsx ya deja
// `data-theme` correcto antes de hidratar, pero este componente NO puede leerlo durante
// el primer render (ni con un inicializador perezoso): el ícono cambia de estructura
// entera entre temas (IconoPluma vs. IconoEscaner), y eso sí produce un error real de
// hidratación (no solo una advertencia) si el servidor y el primer render del cliente no
// coinciden — `suppressHydrationWarning` solo cubre texto, no árboles distintos. Por eso
// el primer render SIEMPRE asume "clasico" (igual que el HTML del servidor) y
// `useLayoutEffect` corrige el ícono/etiqueta justo después de montar, antes de que el
// navegador pinte — sin parpadeo visible y sin desincronizar del servidor.

const ETIQUETA: Record<Tema, string> = { clasico: 'Clásico', moderno: 'Moderno' };
const SIGUIENTE: Record<Tema, Tema> = { clasico: 'moderno', moderno: 'clasico' };

export function SelectorTema({ className = '' }: { className?: string }) {
  const [tema, setTema] = useState<Tema>(TEMA_POR_DEFECTO);

  useLayoutEffect(() => {
    const actual = document.documentElement.dataset.theme;
    const real =
      actual === 'moderno' || actual === 'clasico'
        ? actual
        : (leerTemaGuardado() ?? TEMA_POR_DEFECTO);
    // Sincroniza con `data-theme`, que un script fuera de React ya cambió antes de
    // hidratar; leerlo durante el render (en vez de en un efecto) rompería la
    // hidratación, ver comentario de arriba.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(real);
  }, []);

  function cambiar() {
    const nuevo = SIGUIENTE[tema];
    setTema(nuevo);
    aplicarTema(nuevo);
    guardarTema(nuevo);
  }

  const Icono = tema === 'clasico' ? IconoPluma : IconoEscaner;
  const siguiente = ETIQUETA[SIGUIENTE[tema]];

  return (
    <button
      type="button"
      onClick={cambiar}
      aria-label={`Cambiar a diseño ${siguiente}`}
      title={`Cambiar a diseño ${siguiente}`}
      className={`flex items-center gap-1.5 border border-linea-fuerte bg-white px-3 py-1.5 text-fino font-medium text-tinta shadow-impresa hover:bg-papel-hondo ${className}`}
    >
      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">
        <Icono />
      </span>
      {ETIQUETA[tema]}
    </button>
  );
}
