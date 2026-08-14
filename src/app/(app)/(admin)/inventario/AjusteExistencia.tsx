'use client';

import { useActionState } from 'react';

import { FORMULARIO_INICIAL, type EstadoFormulario } from '@/lib/resultado';
import { ajustarExistencia } from './acciones';

// Un formulario por renglón: la existencia se corrige donde se lee, sin abrir otra pantalla.

export function AjusteExistencia({
  productId,
  branchId,
  stock,
}: {
  productId: number;
  branchId: number;
  stock: string;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    ajustarExistencia,
    FORMULARIO_INICIAL,
  );

  return (
    <form action={enviar} className="flex items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="branchId" value={branchId} />
      <label className="sr-only" htmlFor={`stock-${productId}-${branchId}`}>
        Existencia
      </label>
      <input
        id={`stock-${productId}-${branchId}`}
        name="stock"
        defaultValue={stock}
        inputMode="decimal"
        className="tabular w-24 border border-linea-fuerte bg-white px-2 py-1 text-right font-mono text-base text-tinta"
      />
      <button
        type="submit"
        disabled={enviando}
        className="border border-linea-fuerte bg-white px-2 py-1 text-fino font-medium text-tinta shadow-impresa hover:bg-papel-hondo disabled:opacity-50"
      >
        {enviando ? '…' : 'Ajustar'}
      </button>
      {estado.error && <span className="text-fino text-sello">{estado.error}</span>}
      {estado.errores?.stock && (
        <span className="text-fino text-sello">{estado.errores.stock}</span>
      )}
      {estado.ok && <span className="text-fino text-visto">✓</span>}
    </form>
  );
}
