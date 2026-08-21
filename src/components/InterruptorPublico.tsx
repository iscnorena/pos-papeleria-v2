'use client';

import { useState, useTransition } from 'react';

import { alternarVisibilidadPublica } from '@/app/(app)/herramientas/acciones';

// Solo se monta para admin (lo decide cada pantalla que lo usa): prende/apaga si la
// herramienta aparece en /kit sin sesión. Optimista, con reversión si la Server
// Action falla — el checkbox nunca deja al admin sin saber si de verdad se guardó.

export function InterruptorPublico({
  id,
  publicaInicial,
  rutaPublica,
}: {
  id: string;
  publicaInicial: boolean;
  rutaPublica: string;
}) {
  const [publica, setPublica] = useState(publicaInicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function alternar(valor: boolean) {
    setPublica(valor);
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await alternarVisibilidadPublica(id, valor, rutaPublica);
      if (!resultado.ok) {
        setPublica(!valor);
        setError(resultado.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1 border border-linea-fuerte bg-white p-3 shadow-impresa">
      <label className="flex items-center gap-2 text-base text-tinta">
        <input
          type="checkbox"
          checked={publica}
          disabled={pendiente}
          onChange={(e) => alternar(e.target.checked)}
          className="h-4 w-4"
        />
        Disponible al público, sin cuenta, en{' '}
        <code className="font-mono text-fino text-grafito">{rutaPublica}</code>
      </label>
      {error && <p className="text-fino text-sello">{error}</p>}
    </div>
  );
}
