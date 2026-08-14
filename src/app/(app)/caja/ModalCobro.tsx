'use client';

import { useState, useTransition } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { POS, type MetodoPago } from '@/config/pos';
import { aCentavos, formatear } from '@/lib/money';
import { usarCarrito } from './carrito';
import { registrarVenta, type VentaRegistrada } from './acciones';

// §Fase 4 — cobro: los tres métodos, varios pagos, cambio en vivo y botones de importe
// rápido. El cambio se muestra y NO se guarda (§7.2).

const IMPORTES_RAPIDOS = [5000, 10000, 20000, 50000]; // centavos: $50, $100, $200, $500

type PagoEnPantalla = { metodo: MetodoPago; monto: number };

export function ModalCobro({
  abierto,
  total,
  onCerrar,
  onCobrado,
}: {
  abierto: boolean;
  total: number;
  onCerrar: () => void;
  onCobrado: (venta: VentaRegistrada) => void;
}) {
  const [pagos, setPagos] = useState<PagoEnPantalla[]>([]);
  const [metodo, setMetodo] = useState<MetodoPago>('cash');
  const [montoTexto, setMontoTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  const renglones = usarCarrito((e) => e.renglones);
  const descuentoGeneral = usarCarrito((e) => e.descuentoGeneral);

  const entregado = pagos.reduce((s, p) => s + p.monto, 0);
  const restante = Math.max(0, total - entregado);
  const cambio = Math.max(0, entregado - total);
  const alcanza = entregado >= total - 1; // tolerancia de un centavo (§7.2)

  // Al abrirse, el cobro empieza limpio: arrastrar los pagos de la venta anterior sería
  // la peor clase de error posible en una caja.
  const [estabaAbierto, setEstabaAbierto] = useState(abierto);
  if (abierto !== estabaAbierto) {
    setEstabaAbierto(abierto);
    if (abierto) {
      setPagos([]);
      setMetodo('cash');
      setMontoTexto('');
      setError(null);
    }
  }

  function agregarPago(monto: number) {
    if (monto <= 0) return;
    setPagos((actuales) => [...actuales, { metodo, monto }]);
    setMontoTexto('');
    setError(null);
  }

  function cobrar() {
    setError(null);
    iniciar(async () => {
      const resultado = await registrarVenta({
        renglones: renglones.map((r) => ({
          productId: r.productId,
          cantidad: r.cantidad,
          descuento: r.descuento,
        })),
        descuentoGeneral,
        pagos: pagos.map((p) => ({ metodo: p.metodo, monto: p.monto })),
      });

      if (resultado.ok) onCobrado(resultado.data);
      else setError(resultado.error);
    });
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Cobrar">
      {/* Criterio 6: la venta se cobra sin tocar el mouse. El camino completo es
          F2 → buscar → Enter → F12 → teclear importe → Enter → F12. La segunda F12 es
          esta: la misma tecla que abre el cobro lo confirma cuando ya alcanza. */}
      <div
        onKeyDown={(evento) => {
          if (evento.key === 'F12' && alcanza && !guardando) {
            evento.preventDefault();
            cobrar();
          }
        }}
      >
        <div className="flex items-baseline justify-between border-b border-linea pb-3">
          <span className="text-cuerpo text-grafito">Total</span>
          <span className="tabular font-display text-cifra font-semibold text-tinta">
            {formatear(total)}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {(Object.keys(POS.metodosPago) as MetodoPago[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetodo(m)}
              aria-pressed={metodo === m}
              className={
                metodo === m
                  ? 'flex-1 border border-boligrafo-hondo bg-boligrafo px-2 py-2 text-base text-white'
                  : 'flex-1 border border-linea-fuerte bg-white px-2 py-2 text-base text-tinta hover:bg-papel-hondo'
              }
            >
              {POS.metodosPago[m]}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor="monto-pago">
            Importe
          </label>
          <input
            id="monto-pago"
            value={montoTexto}
            onChange={(e) => setMontoTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregarPago(aCentavos(montoTexto) ?? 0);
              }
            }}
            inputMode="decimal"
            placeholder="Importe"
            className="tabular min-h-[2.5rem] flex-1 border border-linea-fuerte bg-white px-3 text-right font-mono text-cuerpo"
          />
          <Boton variante="secundaria" onClick={() => agregarPago(aCentavos(montoTexto) ?? 0)}>
            Agregar
          </Boton>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {IMPORTES_RAPIDOS.map((importe) => (
            <button
              key={importe}
              type="button"
              onClick={() => agregarPago(importe)}
              className="border border-linea-fuerte bg-white px-3 py-1 font-mono text-fino text-tinta hover:bg-papel-hondo"
            >
              {formatear(importe)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => agregarPago(restante)}
            disabled={restante <= 0}
            className="border border-linea-fuerte bg-white px-3 py-1 font-mono text-fino text-tinta hover:bg-papel-hondo disabled:opacity-50"
          >
            Exacto
          </button>
        </div>

        {pagos.length > 0 && (
          <ul className="mt-4 divide-y divide-linea border-y border-linea">
            {pagos.map((pago, i) => (
              <li key={i} className="flex items-center justify-between py-1.5">
                <span className="text-base text-tinta">{POS.metodosPago[pago.metodo]}</span>
                <span className="tabular font-mono text-base text-tinta">
                  {formatear(pago.monto)}
                </span>
                <button
                  type="button"
                  onClick={() => setPagos((actuales) => actuales.filter((_, j) => j !== i))}
                  aria-label={`Quitar pago de ${formatear(pago.monto)}`}
                  className="ml-3 text-fino text-sello underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-4 space-y-1">
          <div className="flex justify-between">
            <dt className="text-base text-grafito">Entregado</dt>
            <dd className="tabular font-mono text-base text-tinta">{formatear(entregado)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-base text-grafito">{restante > 0 ? 'Falta' : 'Cambio'}</dt>
            <dd
              data-prueba="cambio"
              className={`tabular font-mono text-cifra ${restante > 0 ? 'text-sello' : 'text-visto'}`}
            >
              {formatear(restante > 0 ? restante : cambio)}
            </dd>
          </div>
        </dl>

        {error && (
          <div className="mt-3">
            <Aviso tono="error">{error}</Aviso>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Boton onClick={cobrar} disabled={!alcanza || guardando} className="flex-1">
            {guardando ? 'Cobrando…' : 'Confirmar cobro (F12)'}
          </Boton>
          <Boton variante="secundaria" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
