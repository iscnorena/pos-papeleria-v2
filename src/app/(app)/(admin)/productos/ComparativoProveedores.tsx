'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Aviso } from '@/components/ui/Aviso';
import { Distintivo } from '@/components/ui/Distintivo';
import { momento } from '@/lib/formato';
import { formatear } from '@/lib/money';
import { marcarProveedorPreferido } from './acciones';

// Comparativo de costo por proveedor de un producto (docs/modulo-recepcion-mercancia-xml.md,
// entregable 5): "Tony me lo vende en $40.09, el proveedor B en $38". Se muestra dentro de
// la ficha del producto, junto al formulario de edición.

export type CostoProveedor = {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  lastCost: number;
  lastCostAt: Date | null;
  isPreferred: boolean;
};

export function ComparativoProveedores({
  productId,
  costos,
}: {
  productId: number;
  costos: CostoProveedor[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  if (costos.length === 0) {
    return (
      <p className="mt-6 border border-linea-fuerte bg-papel-hondo p-4 text-fino text-grafito">
        Este producto todavía no se ha recibido de ningún proveedor.
      </p>
    );
  }

  function preferir(supplierId: number) {
    setError(null);
    iniciar(async () => {
      const resultado = await marcarProveedorPreferido({ productId, supplierId });
      if (resultado.ok) router.refresh();
      else setError(resultado.error);
    });
  }

  return (
    <div className="mt-6 border border-linea-fuerte bg-white p-4">
      <h3 className="mb-3 font-display text-cuerpo font-semibold text-tinta">
        Costo por proveedor
      </h3>
      <div className="flex flex-col gap-2">
        {costos
          .slice()
          .sort((a, b) => a.lastCost - b.lastCost)
          .map((c) => (
            <div
              key={c.supplierId}
              className="flex flex-wrap items-center gap-3 border border-linea p-2"
            >
              <span className="flex-1 text-base text-tinta">
                {c.supplierName}{' '}
                <span className="font-mono text-micro text-grafito-claro">({c.supplierCode})</span>
              </span>
              <span className="tabular font-mono text-base text-tinta">
                {formatear(c.lastCost)}
              </span>
              <span className="text-fino text-grafito">
                {c.lastCostAt ? momento(c.lastCostAt) : '—'}
              </span>
              {c.isPreferred ? (
                <Distintivo tono="visto">Preferido</Distintivo>
              ) : (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => preferir(c.supplierId)}
                  className="text-fino text-boligrafo underline disabled:opacity-50"
                >
                  Marcar preferido
                </button>
              )}
            </div>
          ))}
      </div>
      {error && (
        <div className="mt-2">
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}
    </div>
  );
}
