'use client';

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { POS } from '@/config/pos';
import type { ProductoDeCaja } from '@/lib/catalogo';
import { aCentavos, formatear } from '@/lib/money';

// Productos de precio abierto (ej. impresión a color) no tienen un precio fijo: se pide
// aquí, en vez de copiarlo del catálogo, antes de meterlos al carrito.

export function ModalPrecioAbierto({
  producto,
  onCerrar,
  onConfirmar,
}: {
  producto: ProductoDeCaja | null;
  onCerrar: () => void;
  onConfirmar: (precioCentavos: number) => void;
}) {
  const [importeTexto, setImporteTexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    const centavos = aCentavos(importeTexto);
    if (centavos === null || centavos <= 0) {
      setError('Escribe un importe válido.');
      return;
    }
    if (centavos > POS.precioAbiertoMaximo) {
      setError(`El importe no puede superar ${formatear(POS.precioAbiertoMaximo)}.`);
      return;
    }
    onConfirmar(centavos);
    setImporteTexto('');
    setError(null);
  }

  return (
    <Modal
      abierto={producto !== null}
      onCerrar={() => {
        setImporteTexto('');
        setError(null);
        onCerrar();
      }}
      titulo={producto ? `Precio de «${producto.nombre}»` : 'Precio'}
    >
      {/* Sin producto no hay nada que pedir: además, dejar el campo "Importe" montado
          siempre duplicaría el de ModalCobro y las pruebas que lo buscan por su etiqueta
          dejarían de saber a cuál de los dos se refieren. */}
      {producto && (
        <div
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              confirmar();
            }
          }}
        >
          <label className="sr-only" htmlFor="importe-precio-abierto">
            Importe
          </label>
          <input
            id="importe-precio-abierto"
            value={importeTexto}
            onChange={(e) => setImporteTexto(e.target.value)}
            inputMode="decimal"
            autoFocus
            placeholder="Importe"
            className="tabular min-h-tecla w-full border border-linea-fuerte bg-white px-3 text-right font-mono text-cifra"
          />

          {error && (
            <div className="mt-3">
              <Aviso tono="error">{error}</Aviso>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <Boton onClick={confirmar} className="flex-1">
              Agregar
            </Boton>
            <Boton variante="secundaria" onClick={onCerrar}>
              Cancelar
            </Boton>
          </div>
        </div>
      )}
    </Modal>
  );
}
