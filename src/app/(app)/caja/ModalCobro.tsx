'use client';

import { useState, useTransition } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { POS, type MetodoPago } from '@/config/pos';
import { useIdioma } from '@/lib/i18n/cliente';
import type { ClaveI18n } from '@/lib/i18n/nucleo';
import { aCentavos, formatear } from '@/lib/money';
import { usarCarrito } from './carrito';
import { registrarVenta, type VentaRegistrada } from './acciones';

// §Fase 4 — cobro: los tres métodos, varios pagos, cambio en vivo y botones de importe
// rápido. El cambio se muestra y NO se guarda (§7.2).

const IMPORTES_RAPIDOS = [5000, 10000, 20000, 50000]; // centavos: $50, $100, $200, $500

// `POS.metodosPago` (src/config/pos.ts) es config de negocio, no de interfaz — se queda en
// español ahí. Lo que se muestra en pantalla sale de este mapa, no de esos valores.
const ETIQUETA_METODO: Record<MetodoPago, ClaveI18n> = {
  cash: 'caja.efectivo',
  card: 'caja.tarjeta',
  transfer: 'caja.transferencia',
};

type PagoEnPantalla = { metodo: MetodoPago; monto: number; referencia?: string };

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
  const { t } = useIdioma();
  const [pagos, setPagos] = useState<PagoEnPantalla[]>([]);
  const [metodo, setMetodo] = useState<MetodoPago>('cash');
  const [montoTexto, setMontoTexto] = useState('');
  const [referenciaTexto, setReferenciaTexto] = useState('');
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
      setReferenciaTexto('');
      setError(null);
    }
  }

  function agregarPago(monto: number) {
    if (monto <= 0) return;
    const referencia = referenciaTexto.trim();
    setPagos((actuales) => [...actuales, { metodo, monto, ...(referencia ? { referencia } : {}) }]);
    setMontoTexto('');
    setReferenciaTexto('');
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
          ...(r.precioAbierto ? { precioUnitario: r.precioUnitario } : {}),
        })),
        descuentoGeneral,
        pagos: pagos.map((p) => ({ metodo: p.metodo, monto: p.monto, referencia: p.referencia })),
      });

      if (resultado.ok) onCobrado(resultado.data);
      else setError(resultado.error);
    });
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={t('caja.cobrar')}>
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
          <span className="text-cuerpo text-grafito">{t('caja.total')}</span>
          <span className="tabular font-display text-cifra font-semibold text-tinta">
            {formatear(total)}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {(Object.keys(POS.metodosPago) as MetodoPago[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMetodo(m);
                setReferenciaTexto('');
              }}
              aria-pressed={metodo === m}
              className={
                metodo === m
                  ? 'flex-1 border border-boligrafo-hondo bg-boligrafo px-2 py-2 text-base text-white'
                  : 'flex-1 border border-linea-fuerte bg-white px-2 py-2 text-base text-tinta hover:bg-papel-hondo'
              }
            >
              {t(ETIQUETA_METODO[m])}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor="monto-pago">
            {t('caja.importe')}
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
            placeholder={t('caja.importe')}
            className="tabular min-h-[2.5rem] flex-1 border border-linea-fuerte bg-white px-3 text-right font-mono text-cuerpo"
          />
          <Boton variante="secundaria" onClick={() => agregarPago(aCentavos(montoTexto) ?? 0)}>
            {t('caja.agregar')}
          </Boton>
        </div>

        {(metodo === 'card' || metodo === 'transfer') && (
          <div className="mt-2">
            <label className="sr-only" htmlFor="referencia-pago">
              {t('caja.folioOReferencia')}
            </label>
            <input
              id="referencia-pago"
              value={referenciaTexto}
              onChange={(e) => setReferenciaTexto(e.target.value)}
              maxLength={60}
              placeholder={t('caja.folioTerminalPlaceholder')}
              className="min-h-[2.5rem] w-full border border-linea-fuerte bg-white px-3 text-base text-tinta"
            />
          </div>
        )}

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
            {t('caja.exacto')}
          </button>
        </div>

        {pagos.length > 0 && (
          <ul className="mt-4 divide-y divide-linea border-y border-linea">
            {pagos.map((pago, i) => (
              <li key={i} className="flex items-center justify-between py-1.5">
                <span className="text-base text-tinta">
                  {t(ETIQUETA_METODO[pago.metodo])}
                  {pago.referencia && (
                    <span className="ml-1 text-fino text-grafito-claro">· {pago.referencia}</span>
                  )}
                </span>
                <span className="tabular font-mono text-base text-tinta">
                  {formatear(pago.monto)}
                </span>
                <button
                  type="button"
                  onClick={() => setPagos((actuales) => actuales.filter((_, j) => j !== i))}
                  aria-label={t('caja.quitarPagoDe', { monto: formatear(pago.monto) })}
                  className="ml-3 text-fino text-sello underline"
                >
                  {t('caja.quitar')}
                </button>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-4 space-y-1">
          <div className="flex justify-between">
            <dt className="text-base text-grafito">{t('caja.entregado')}</dt>
            <dd className="tabular font-mono text-base text-tinta">{formatear(entregado)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-base text-grafito">
              {restante > 0 ? t('caja.falta') : t('caja.cambio')}
            </dt>
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
            {guardando ? t('caja.cobrando') : t('caja.confirmarCobroF12')}
          </Boton>
          <Boton variante="secundaria" onClick={onCerrar} disabled={guardando}>
            {t('comun.cancelar')}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
