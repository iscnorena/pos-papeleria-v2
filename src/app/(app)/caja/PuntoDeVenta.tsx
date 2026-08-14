'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Distintivo } from '@/components/ui/Distintivo';
import { POS } from '@/config/pos';
import type { ProductoDeCaja } from '@/lib/catalogo';
import { clases } from '@/lib/clases';
import { aCentavos, formatear, formatearCantidad } from '@/lib/money';
import { totalesDe, usarCarrito } from './carrito';
import { ModalCobro } from './ModalCobro';
import { PantallaExito } from './PantallaExito';
import type { VentaRegistrada } from './acciones';

// §Fase 4 — dos columnas: catálogo a la izquierda, carrito a la derecha con estética de
// cinta de ticket. El catálogo COMPLETO viaja con la página desde el Server Component:
// buscar deja de depender de la red en cada tecla, y si el internet parpadea a media venta
// la caja sigue armando el ticket.

export function PuntoDeVenta({ catalogo }: { catalogo: ProductoDeCaja[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<number | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<VentaRegistrada | null>(null);
  const buscador = useRef<HTMLInputElement>(null);

  const renglones = usarCarrito((e) => e.renglones);
  const activo = usarCarrito((e) => e.activo);
  const descuentoGeneral = usarCarrito((e) => e.descuentoGeneral);
  const agregar = usarCarrito((e) => e.agregar);
  const sumarCantidad = usarCarrito((e) => e.sumarCantidad);
  const quitar = usarCarrito((e) => e.quitar);
  const vaciar = usarCarrito((e) => e.vaciar);

  const totales = useMemo(
    () => totalesDe(renglones, descuentoGeneral, POS.tasaImpuesto),
    [renglones, descuentoGeneral],
  );

  const categorias = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const p of catalogo)
      if (p.categoriaId && p.categoria) mapa.set(p.categoriaId, p.categoria);
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [catalogo]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return catalogo.filter((p) => {
      if (categoria !== null && p.categoriaId !== categoria) return false;
      if (texto === '') return true;
      return (
        p.nombre.toLowerCase().includes(texto) || (p.codigo ?? '').toLowerCase().includes(texto)
      );
    });
  }, [catalogo, busqueda, categoria]);

  const puedeCobrar = renglones.length > 0 && totales.total >= 0;

  const abrirCobro = useCallback(() => {
    if (puedeCobrar) setCobrando(true);
  }, [puedeCobrar]);

  // §Fase 4 — la caja se opera sin mouse. Estos son los atajos que muestra la barra del pie.
  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      const enCampo =
        evento.target instanceof HTMLElement &&
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(evento.target.tagName);

      if (evento.key === 'F2') {
        evento.preventDefault();
        buscador.current?.focus();
        buscador.current?.select();
        return;
      }
      if (evento.key === 'F12') {
        evento.preventDefault();
        abrirCobro();
        return;
      }
      // El resto solo aplica fuera de un campo de texto: si no, no se podría escribir «+».
      if (enCampo) return;

      if (evento.key === '+' && activo !== null) {
        evento.preventDefault();
        sumarCantidad(activo, 100);
      } else if (evento.key === '-' && activo !== null) {
        evento.preventDefault();
        sumarCantidad(activo, -100);
      } else if (evento.key === 'Delete' && activo !== null) {
        evento.preventDefault();
        quitar(activo);
      }
    }

    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [activo, abrirCobro, quitar, sumarCantidad]);

  if (ultimaVenta) {
    return (
      <PantallaExito
        venta={ultimaVenta}
        onNuevaVenta={() => {
          setUltimaVenta(null);
          setBusqueda('');
          buscador.current?.focus();
        }}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_25rem]">
      {/* ── Catálogo ─────────────────────────────────────────────────────────────── */}
      <section aria-label="Catálogo">
        <form
          className="mb-4 flex flex-wrap gap-3"
          onSubmit={(evento) => {
            // Enter en el buscador agrega el primer resultado: es el flujo con lector de
            // código de barras, que teclea el código y manda un Enter.
            evento.preventDefault();
            const primero = filtrados[0];
            if (primero) {
              agregar(primero);
              setBusqueda('');
            }
          }}
        >
          <input
            ref={buscador}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código…  (F2)"
            aria-label="Buscar producto"
            autoFocus
            className="min-h-tecla flex-1 border border-linea-fuerte bg-white px-3 text-cuerpo text-tinta"
          />
          <select
            aria-label="Categoría"
            value={categoria ?? ''}
            onChange={(e) => setCategoria(e.target.value === '' ? null : Number(e.target.value))}
            className="min-h-tecla border border-linea-fuerte bg-white px-3 text-base text-tinta"
          >
            <option value="">Todas</option>
            {categorias.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </form>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((producto) => {
            const existencia = aCentavos(producto.existencia) ?? 0;
            const agotado = producto.manejaInventario && existencia <= 0;
            return (
              <button
                key={producto.id}
                type="button"
                onClick={() => agregar(producto)}
                className={clases(
                  'flex min-h-tecla flex-col items-start gap-1 border p-3 text-left shadow-impresa',
                  'transition-colors duration-avance hover:bg-papel-hondo',
                  agotado ? 'border-linea bg-white opacity-60' : 'border-linea-fuerte bg-white',
                )}
              >
                <span className="line-clamp-2 text-base text-tinta">{producto.nombre}</span>
                <span className="tabular font-mono text-cuerpo text-tinta">
                  {formatear(aCentavos(producto.precio) ?? 0)}
                </span>
                {producto.manejaInventario ? (
                  agotado ? (
                    <Distintivo tono="sello">Sin existencia</Distintivo>
                  ) : (
                    <span className="font-mono text-micro uppercase text-grafito-claro">
                      {formatearCantidad(existencia)} en existencia
                    </span>
                  )
                ) : (
                  <span className="font-mono text-micro uppercase text-grafito-claro">
                    Servicio
                  </span>
                )}
              </button>
            );
          })}
          {filtrados.length === 0 && (
            <p className="col-span-full border border-linea bg-white p-6 text-center text-base text-grafito">
              Nada coincide con «{busqueda}».
            </p>
          )}
        </div>
      </section>

      {/* ── Carrito: cinta de ticket ─────────────────────────────────────────────── */}
      <aside
        aria-label="Ticket"
        className="flex h-fit w-full max-w-cinta flex-col border border-linea-fuerte bg-white shadow-cinta"
      >
        <header className="flex items-center justify-between border-b border-linea-fuerte px-4 py-2">
          <h2 className="font-mono text-micro uppercase text-grafito">Ticket</h2>
          {renglones.length > 0 && (
            <button type="button" onClick={vaciar} className="text-fino text-sello underline">
              Vaciar
            </button>
          )}
        </header>

        <ul className="divide-y divide-linea">
          {renglones.length === 0 && (
            <li className="px-4 py-10 text-center text-base text-grafito">
              Toca un producto para empezar.
            </li>
          )}
          {renglones.map((renglon) => (
            <RenglonTicket
              key={renglon.productId}
              renglon={renglon}
              activo={activo === renglon.productId}
            />
          ))}
        </ul>

        <footer className="border-t border-linea-fuerte px-4 py-3">
          <Linea etiqueta="Subtotal" valor={formatear(totales.subtotal)} />
          {POS.tasaImpuesto > 0 && (
            <Linea etiqueta="Impuesto" valor={formatear(totales.impuesto)} />
          )}
          <DescuentoGeneral />

          {/* El total en el escalón `total`, resaltado en `marcador`: es el ancla visual de
              la pantalla y tiene que leerse desde el otro lado del mostrador (§4). */}
          <div className="mt-3 flex items-baseline justify-between border-t border-linea-fuerte pt-3">
            <span className="text-cuerpo text-tinta">Total</span>
            <span className="tabular bg-marcador px-2 font-display text-total font-semibold text-tinta">
              {formatear(totales.total)}
            </span>
          </div>

          <button
            type="button"
            onClick={abrirCobro}
            disabled={!puedeCobrar}
            className="mt-4 min-h-tecla w-full border border-boligrafo-hondo bg-boligrafo text-cuerpo font-medium text-white shadow-impresa hover:bg-boligrafo-hondo disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cobrar (F12)
          </button>
        </footer>
      </aside>

      <p className="col-span-full border-t border-linea pt-3 font-mono text-micro uppercase text-grafito-claro">
        F2 buscar · Enter agrega el primero · +/− cantidad · Supr quita · F12 cobrar · Esc cierra
      </p>

      <ModalCobro
        abierto={cobrando}
        total={totales.total}
        onCerrar={() => setCobrando(false)}
        onCobrado={(venta) => {
          setCobrando(false);
          vaciar();
          setUltimaVenta(venta);
        }}
      />
    </div>
  );
}

function RenglonTicket({
  renglon,
  activo,
}: {
  renglon: ReturnType<typeof usarCarrito.getState>['renglones'][number];
  activo: boolean;
}) {
  const activar = usarCarrito((e) => e.activar);
  const cambiarCantidad = usarCarrito((e) => e.cambiarCantidad);
  const cambiarDescuento = usarCarrito((e) => e.cambiarDescuento);
  const quitar = usarCarrito((e) => e.quitar);

  const importe = Math.round((renglon.precioUnitario * renglon.cantidad) / 100) - renglon.descuento;

  return (
    <li
      onFocus={() => activar(renglon.productId)}
      onClick={() => activar(renglon.productId)}
      // El renglón activo se resalta en `marcador-tenue`: el único otro sitio donde
      // aparece el resaltador, además del total (§4).
      className={clases('px-4 py-2', activo && 'bg-marcador-tenue')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base text-tinta">{renglon.nombre}</span>
        <span className="tabular font-mono text-base text-tinta">{formatear(importe)}</span>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <label className="sr-only" htmlFor={`cant-${renglon.productId}`}>
          Cantidad de {renglon.nombre}
        </label>
        <input
          id={`cant-${renglon.productId}`}
          value={formatearCantidad(renglon.cantidad)}
          onChange={(e) =>
            cambiarCantidad(renglon.productId, (aCentavos(e.target.value) ?? 0) || 100)
          }
          inputMode="decimal"
          className="tabular w-16 border border-linea-fuerte bg-white px-2 py-1 text-right font-mono text-fino"
        />
        <span className="font-mono text-micro text-grafito-claro">
          × {formatear(renglon.precioUnitario)}
        </span>

        <label className="sr-only" htmlFor={`desc-${renglon.productId}`}>
          Descuento de {renglon.nombre}
        </label>
        <input
          id={`desc-${renglon.productId}`}
          value={(renglon.descuento / 100).toFixed(2)}
          onChange={(e) => cambiarDescuento(renglon.productId, aCentavos(e.target.value) ?? 0)}
          inputMode="decimal"
          aria-label={`Descuento de ${renglon.nombre}`}
          className="tabular w-16 border border-linea-fuerte bg-white px-2 py-1 text-right font-mono text-fino"
        />

        <button
          type="button"
          onClick={() => quitar(renglon.productId)}
          aria-label={`Quitar ${renglon.nombre}`}
          className="ml-auto text-fino text-sello underline"
        >
          Quitar
        </button>
      </div>
    </li>
  );
}

function DescuentoGeneral() {
  const descuentoGeneral = usarCarrito((e) => e.descuentoGeneral);
  const cambiar = usarCarrito((e) => e.cambiarDescuentoGeneral);

  return (
    <div className="flex items-baseline justify-between py-1">
      <label htmlFor="descuento-general" className="text-base text-grafito">
        Descuento
      </label>
      <input
        id="descuento-general"
        value={(descuentoGeneral / 100).toFixed(2)}
        onChange={(e) => cambiar(aCentavos(e.target.value) ?? 0)}
        inputMode="decimal"
        className="tabular w-24 border border-linea-fuerte bg-white px-2 py-1 text-right font-mono text-base"
      />
    </div>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-base text-grafito">{etiqueta}</span>
      <span className="tabular font-mono text-base text-tinta">{valor}</span>
    </div>
  );
}
