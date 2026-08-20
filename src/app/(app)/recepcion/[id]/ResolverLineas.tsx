'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Distintivo } from '@/components/ui/Distintivo';
import { aCentavos, aCentesimas, formatear, formatearCantidad } from '@/lib/money';
import { agregarLineaManual, editarLinea, eliminarLinea } from '../acciones';
import { BuscadorProducto } from './BuscadorProducto';

export type LineaRecepcion = {
  id: number;
  description: string;
  supplierCode: string | null;
  quantity: string;
  unitCost: string;
  lineTotal: string;
  productId: number | null;
  productName: string | null;
  productCode: string | null;
  alertaVariacion: boolean;
};

export function ResolverLineas({
  receiptId,
  lineas,
  categorias,
}: {
  receiptId: number;
  lineas: LineaRecepcion[];
  categorias: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [buscadorAbierto, setBuscadorAbierto] = useState<number | null>(null);

  function refrescar() {
    setBuscadorAbierto(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {lineas.length === 0 && (
        <p className="border border-linea-fuerte bg-papel-hondo p-4 text-base text-grafito">
          Esta recepción todavía no tiene líneas.
        </p>
      )}

      {lineas.map((linea) => (
        <div
          key={linea.id}
          data-testid="linea-recepcion"
          className="border border-linea-fuerte bg-white p-3"
        >
          <FilaLinea linea={linea} onCambiada={refrescar} />

          {linea.productId === null && buscadorAbierto !== linea.id && (
            <button
              type="button"
              onClick={() => setBuscadorAbierto(linea.id)}
              className="mt-2 text-fino text-boligrafo underline"
            >
              Vincular producto
            </button>
          )}

          {buscadorAbierto === linea.id && (
            <div className="mt-2">
              <BuscadorProducto
                lineId={linea.id}
                descripcionInicial={linea.description}
                categorias={categorias}
                onResuelto={refrescar}
              />
            </div>
          )}

          {linea.productId !== null && buscadorAbierto !== linea.id && (
            <button
              type="button"
              onClick={() => setBuscadorAbierto(linea.id)}
              className="mt-2 text-fino text-boligrafo underline"
            >
              Cambiar producto
            </button>
          )}
        </div>
      ))}

      <AgregarLinea receiptId={receiptId} onAgregada={refrescar} />
    </div>
  );
}

function FilaLinea({ linea, onCambiada }: { linea: LineaRecepcion; onCambiada: () => void }) {
  const [descripcion, setDescripcion] = useState(linea.description);
  const [cantidad, setCantidad] = useState(formatearCantidad(aCentesimas(linea.quantity) ?? 0));
  const [costo, setCosto] = useState(((aCentavos(linea.unitCost) ?? 0) / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function guardar(cambios: { description?: string; quantity?: string; unitCost?: string }) {
    setError(null);
    iniciar(async () => {
      const resultado = await editarLinea({ lineId: linea.id, ...cambios });
      if (resultado.ok) onCambiada();
      else setError(resultado.error);
    });
  }

  function eliminar() {
    setError(null);
    iniciar(async () => {
      const resultado = await eliminarLinea({ lineId: linea.id });
      if (resultado.ok) onCambiada();
      else setError(resultado.error);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <Campo
          etiqueta="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          onBlur={() => descripcion !== linea.description && guardar({ description: descripcion })}
          disabled={enviando}
        />
        {linea.supplierCode && (
          <span className="font-mono text-micro text-grafito-claro">
            Código: {linea.supplierCode}
          </span>
        )}
      </div>

      <div className="w-24">
        <Campo
          etiqueta="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          onBlur={() => guardar({ quantity: cantidad })}
          disabled={enviando}
          inputMode="decimal"
          className="tabular text-right font-mono"
        />
      </div>

      <div className="w-28">
        <Campo
          etiqueta="Costo unitario"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          onBlur={() => guardar({ unitCost: costo })}
          disabled={enviando}
          inputMode="decimal"
          className="tabular text-right font-mono"
        />
      </div>

      <div className="flex w-28 flex-col gap-1">
        <span className="text-fino font-medium text-tinta">Total línea</span>
        <span className="tabular min-h-[2.25rem] px-2 py-1 text-right font-mono text-base text-tinta">
          {formatear(aCentavos(linea.lineTotal) ?? 0)}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-fino font-medium text-tinta">Producto</span>
        {linea.productId !== null ? (
          <span className="text-base text-tinta">
            {linea.productName}{' '}
            {linea.productCode && <span className="text-grafito-claro">({linea.productCode})</span>}
          </span>
        ) : (
          <Distintivo tono="sello">Sin vincular</Distintivo>
        )}
        {linea.alertaVariacion && <Distintivo tono="marcador">Costo varió {'>'} 15%</Distintivo>}
      </div>

      <button
        type="button"
        onClick={eliminar}
        disabled={enviando}
        className="ml-auto text-fino text-sello underline disabled:opacity-50"
      >
        Eliminar
      </button>

      {error && (
        <div className="w-full">
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}
    </div>
  );
}

function AgregarLinea({ receiptId, onAgregada }: { receiptId: number; onAgregada: () => void }) {
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [costo, setCosto] = useState('0.00');
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function agregar() {
    setError(null);
    iniciar(async () => {
      const resultado = await agregarLineaManual({
        receiptId,
        description: descripcion,
        quantity: cantidad,
        unitCost: costo,
      });
      if (resultado.ok) {
        setDescripcion('');
        setCantidad('1');
        setCosto('0.00');
        onAgregada();
      } else {
        setError(resultado.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border border-dashed border-linea-fuerte p-3">
      <div className="min-w-[14rem] flex-1">
        <Campo
          etiqueta="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Nombre del producto tal como lo factura el proveedor"
        />
      </div>
      <div className="w-24">
        <Campo
          etiqueta="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          inputMode="decimal"
          className="tabular text-right font-mono"
        />
      </div>
      <div className="w-28">
        <Campo
          etiqueta="Costo unitario"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          inputMode="decimal"
          className="tabular text-right font-mono"
        />
      </div>
      <Boton
        type="button"
        variante="secundaria"
        disabled={enviando || descripcion.trim() === ''}
        onClick={agregar}
      >
        {enviando ? 'Agregando…' : 'Agregar línea'}
      </Boton>
      {error && (
        <div className="w-full">
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}
    </div>
  );
}
