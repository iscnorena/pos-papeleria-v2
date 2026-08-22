'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { cambiarIdioma } from '@/app/acciones-idioma';
import { useIdioma } from '@/lib/i18n/cliente';
import type { Idioma } from '@/lib/i18n/nucleo';
import { IconoIdioma } from '@/tools/iconos';

// Selector permanente ES/EN, mismo lugar del header que <SelectorTema />. A diferencia
// de ese, cambiar de idioma sí necesita ida y vuelta al servidor (`router.refresh()`
// tras la Server Action): el texto lo generan Server Components, no CSS — ver
// src/lib/i18n/servidor.ts.

const SIGUIENTE: Record<Idioma, Idioma> = { es: 'en', en: 'es' };

export function SelectorIdioma({ className = '' }: { className?: string }) {
  const router = useRouter();
  const { idioma, t } = useIdioma();
  const [enviando, iniciar] = useTransition();

  function cambiar() {
    const nuevo = SIGUIENTE[idioma];
    iniciar(async () => {
      await cambiarIdioma(nuevo);
      router.refresh();
    });
  }

  const etiqueta = idioma === 'es' ? t('idioma.cambiarAIngles') : t('idioma.cambiarAEspanol');

  return (
    <button
      type="button"
      onClick={cambiar}
      disabled={enviando}
      aria-label={etiqueta}
      title={etiqueta}
      className={`flex items-center gap-1.5 border border-linea-fuerte bg-white px-3 py-1.5 text-fino font-medium text-tinta shadow-impresa hover:bg-papel-hondo disabled:opacity-60 ${className}`}
    >
      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">
        <IconoIdioma />
      </span>
      {idioma.toUpperCase()}
    </button>
  );
}
