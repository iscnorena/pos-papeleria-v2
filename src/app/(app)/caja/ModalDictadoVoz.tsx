'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Distintivo } from '@/components/ui/Distintivo';
import { Modal } from '@/components/ui/Modal';
import type { ProductoDeCaja } from '@/lib/catalogo';
import { clases } from '@/lib/clases';
import { formatearCantidad } from '@/lib/money';
import { mejoresCoincidencias } from '@/lib/similitudTexto';
import { resolverItemsDeVoz, type EstadoItemVoz } from '@/lib/vozTicket';
import { usarCarrito } from './carrito';

// Precarga de Ticket por Voz (docs/modulo-venta-por-voz.md). La voz NUNCA cobra directo: solo
// llena el mismo carrito (`usarCarrito`) que ya usa el resto de la caja, y el cajero revisa y
// confirma cada línea antes de que exista en el ticket — mismo principio que la autorización
// de Recepción de Mercancía, aplicado aquí a "confirmar el carrito".
//
// STT: Web Speech API del navegador (gratis, sin backend). Solo Chrome/Edge: si el navegador
// no la trae, el botón ni se pinta. Extracción: reglas por texto (`src/lib/vozTicket.ts`), no
// LLM — decisión explícita para no depender de un proveedor externo nuevo.

const CLAVE_PRODUCTO = (p: ProductoDeCaja) => p.nombre;

type LineaRevision = {
  id: number;
  cantidadTexto: string;
  productoId: number | null;
  descripcionOriginal: string;
  estado: EstadoItemVoz;
  candidatos: { item: ProductoDeCaja; similitud: number }[];
  buscando: boolean;
};

function reconocedorDisponible(): SpeechRecognitionConstructor | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function reconocedorEnServidor(): SpeechRecognitionConstructor | null {
  return null;
}

function sinSuscripcion(): () => void {
  // La disponibilidad de la API no cambia durante la sesión: no hay a qué suscribirse.
  return () => {};
}

export function BotonDictadoVoz({ catalogo }: { catalogo: ProductoDeCaja[] }) {
  const [abierto, setAbierto] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [errorMic, setErrorMic] = useState<string | null>(null);
  const [lineas, setLineas] = useState<LineaRevision[]>([]);

  const reconocedor = useRef<SpeechRecognition | null>(null);
  const transcritoFinal = useRef('');
  const contadorId = useRef(0);
  const agregarConCantidad = usarCarrito((e) => e.agregarConCantidad);

  // `useSyncExternalStore` (no un `useEffect` + `setState`) es la forma correcta de leer un
  // valor que solo existe en el cliente sin mismatch de hidratación: el servidor siempre usa
  // `getServerSnapshot` (null, nunca hay `window` ahí) y el cliente cambia a la API real en
  // cuanto React reconcilia después de montar — un `typeof window !== 'undefined'` directo
  // en el render pintaría el botón en el cliente pero no en el servidor, y React lo marca
  // como error de hidratación.
  const Constructor = useSyncExternalStore(
    sinSuscripcion,
    reconocedorDisponible,
    reconocedorEnServidor,
  );

  useEffect(() => {
    return () => {
      reconocedor.current?.abort();
    };
  }, []);

  if (!Constructor) return null;

  function procesarTranscripcion(texto: string) {
    if (texto.trim() === '') return;
    const resueltos = resolverItemsDeVoz(texto, catalogo, CLAVE_PRODUCTO);
    const nuevas: LineaRevision[] = resueltos.map((r) => ({
      id: contadorId.current++,
      cantidadTexto: r.cantidad !== null ? formatearCantidad(r.cantidad * 100) : '',
      productoId: r.estado === 'resuelta' ? (r.candidatos[0]?.item.id ?? null) : null,
      descripcionOriginal: r.descripcion,
      estado: r.estado,
      candidatos: r.candidatos,
      buscando: false,
    }));
    // Se AGREGA a lo ya resuelto, nunca lo reemplaza: si el cajero vuelve a grabar porque el
    // ruido de la tienda arruinó una parte, no pierde lo que ya había quedado bien (caso
    // borde explícito de la spec).
    setLineas((actuales) => [...actuales, ...nuevas]);
  }

  function empezarGrabacion() {
    if (!Constructor) return;
    setErrorMic(null);
    setParcial('');
    transcritoFinal.current = '';

    const instancia = new Constructor();
    instancia.lang = 'es-MX';
    instancia.continuous = true;
    instancia.interimResults = true;

    instancia.onresult = (evento) => {
      let interina = '';
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const resultado = evento.results[i];
        if (!resultado) continue;
        const texto = resultado[0]?.transcript ?? '';
        if (resultado.isFinal) transcritoFinal.current += `${texto} `;
        else interina += texto;
      }
      setParcial(interina);
    };

    instancia.onerror = (evento) => {
      const mensajes: Record<string, string> = {
        'not-allowed':
          'Permiso de micrófono denegado. Actívalo en el navegador e intenta de nuevo.',
        'no-speech': 'No se escuchó nada. Intenta de nuevo más cerca del micrófono.',
        network: 'Sin conexión para reconocer voz. Revisa tu internet.',
      };
      setErrorMic(mensajes[evento.error] ?? 'No se pudo grabar. Intenta de nuevo.');
      setGrabando(false);
    };

    instancia.onend = () => {
      setGrabando(false);
      setParcial('');
      procesarTranscripcion(transcritoFinal.current);
    };

    reconocedor.current = instancia;
    instancia.start();
    setGrabando(true);
    setAbierto(true);
  }

  function detenerGrabacion() {
    reconocedor.current?.stop();
  }

  function cerrar() {
    if (grabando) detenerGrabacion();
    setAbierto(false);
    setLineas([]);
  }

  function actualizarLinea(id: number, cambios: Partial<LineaRevision>) {
    setLineas((actuales) => actuales.map((l) => (l.id === id ? { ...l, ...cambios } : l)));
  }

  function descartarLinea(id: number) {
    setLineas((actuales) => actuales.filter((l) => l.id !== id));
  }

  function agregarLineaAlCarrito(linea: LineaRevision) {
    const producto = catalogo.find((p) => p.id === linea.productoId);
    if (!producto) return;
    const cantidad = Number(linea.cantidadTexto.replace(',', '.'));
    if (!Number.isFinite(cantidad) || cantidad <= 0) return;
    if (producto.precioAbierto) return; // requiere precio a mano: no se agrega por voz

    agregarConCantidad(producto, Math.round(cantidad * 100));
    descartarLinea(linea.id);
  }

  function agregarTodasLasListas() {
    for (const linea of lineas) {
      const producto = catalogo.find((p) => p.id === linea.productoId);
      const cantidad = Number(linea.cantidadTexto.replace(',', '.'));
      if (producto && !producto.precioAbierto && Number.isFinite(cantidad) && cantidad > 0) {
        agregarLineaAlCarrito(linea);
      }
    }
  }

  const hayListasParaAgregar = lineas.some((l) => {
    const producto = catalogo.find((p) => p.id === l.productoId);
    const cantidad = Number(l.cantidadTexto.replace(',', '.'));
    return producto && !producto.precioAbierto && Number.isFinite(cantidad) && cantidad > 0;
  });

  return (
    <>
      <button
        type="button"
        onClick={grabando ? detenerGrabacion : empezarGrabacion}
        className={clases(
          'flex min-h-tecla items-center gap-2 border px-3 text-base font-medium shadow-impresa',
          grabando
            ? 'animate-pulse border-sello-hondo bg-sello text-white'
            : 'border-linea-fuerte bg-white text-tinta hover:bg-papel-hondo',
        )}
      >
        <span
          className={clases(
            'inline-block h-2.5 w-2.5 rounded-full',
            grabando ? 'bg-white' : 'bg-sello',
          )}
        />
        {grabando ? 'Escuchando… (toca para terminar)' : 'Dictar pedido'}
      </button>

      <Modal abierto={abierto} onCerrar={cerrar} titulo="Dictado del pedido">
        <div className="max-h-[65vh] overflow-y-auto">
          {grabando && (
            <div className="mb-4 border border-sello-hondo bg-sello-tenue p-3">
              <p className="flex items-center gap-2 text-fino font-medium text-sello-hondo">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sello-hondo" />
                Escuchando…
              </p>
              <p className="mt-1 min-h-[1.5em] text-base text-tinta">
                {parcial || 'Di lo que lleva el cliente…'}
              </p>
            </div>
          )}

          {errorMic && <Aviso tono="error">{errorMic}</Aviso>}

          {!grabando && lineas.length === 0 && !errorMic && (
            <p className="border border-linea-fuerte bg-papel-hondo p-4 text-base text-grafito">
              Toca «Dictar pedido» y di, por ejemplo: «lleva un borrador marca Dixon, lleva 4
              libretas raya marca Swing».
            </p>
          )}

          {lineas.length > 0 && (
            <div className="flex flex-col gap-3">
              {lineas.map((linea) => (
                <LineaDictado
                  key={linea.id}
                  linea={linea}
                  catalogo={catalogo}
                  onCambiar={(cambios) => actualizarLinea(linea.id, cambios)}
                  onDescartar={() => descartarLinea(linea.id)}
                  onAgregar={() => agregarLineaAlCarrito(linea)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-linea pt-4">
          {!grabando && (
            <Boton type="button" variante="secundaria" onClick={empezarGrabacion}>
              {lineas.length > 0 ? 'Grabar más' : 'Dictar pedido'}
            </Boton>
          )}
          {lineas.length > 0 && (
            <Boton type="button" disabled={!hayListasParaAgregar} onClick={agregarTodasLasListas}>
              Agregar todo al ticket
            </Boton>
          )}
          <button
            type="button"
            onClick={cerrar}
            className="ml-auto text-fino text-boligrafo underline"
          >
            Cerrar
          </button>
        </div>
      </Modal>
    </>
  );
}

function LineaDictado({
  linea,
  catalogo,
  onCambiar,
  onDescartar,
  onAgregar,
}: {
  linea: LineaRevision;
  catalogo: ProductoDeCaja[];
  onCambiar: (cambios: Partial<LineaRevision>) => void;
  onDescartar: () => void;
  onAgregar: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const producto = catalogo.find((p) => p.id === linea.productoId) ?? null;

  const resultadosBusqueda = useMemo(() => {
    if (busqueda.trim() === '') return [];
    return mejoresCoincidencias(busqueda, catalogo, CLAVE_PRODUCTO, { limite: 5, umbral: 0.15 });
  }, [busqueda, catalogo]);

  const faltaCantidad = linea.cantidadTexto.trim() === '';
  const listaParaAgregar = producto !== null && !producto.precioAbierto && !faltaCantidad;

  return (
    <div className="border border-linea-fuerte p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-base text-tinta">
          «{linea.descripcionOriginal}»
          {linea.estado === 'resuelta' && (
            <Distintivo tono="visto" className="ml-2">
              Reconocido
            </Distintivo>
          )}
          {linea.estado === 'ambigua' && (
            <Distintivo tono="marcador" className="ml-2">
              Elige uno
            </Distintivo>
          )}
          {linea.estado === 'no_reconocida' && (
            <Distintivo tono="sello" className="ml-2">
              No reconocido
            </Distintivo>
          )}
        </span>
        <button type="button" onClick={onDescartar} className="text-fino text-sello underline">
          Descartar
        </button>
      </div>

      {producto ? (
        <p className="mt-2 text-base text-tinta">
          Producto: <span className="font-medium">{producto.nombre}</span>
          {producto.precioAbierto && (
            <span className="ml-2 text-fino text-grafito">
              (precio libre — agrégalo tocándolo en el catálogo)
            </span>
          )}
        </p>
      ) : (
        linea.candidatos.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            <p className="text-fino text-grafito">Candidatos:</p>
            {linea.candidatos.map((c) => (
              <button
                key={c.item.id}
                type="button"
                onClick={() => onCambiar({ productoId: c.item.id })}
                className="w-full border border-linea-fuerte bg-white px-2 py-1 text-left text-fino text-tinta hover:bg-papel-hondo"
              >
                {c.item.nombre}
              </button>
            ))}
          </div>
        )
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="text-fino font-medium text-tinta" htmlFor={`cant-voz-${linea.id}`}>
          Cantidad
        </label>
        <input
          id={`cant-voz-${linea.id}`}
          value={linea.cantidadTexto}
          onChange={(e) => onCambiar({ cantidadTexto: e.target.value })}
          placeholder="?"
          inputMode="decimal"
          className={clases(
            'tabular w-16 border bg-white px-2 py-1 text-right font-mono text-fino',
            faltaCantidad ? 'border-sello' : 'border-linea-fuerte',
          )}
        />
        {faltaCantidad && <span className="text-fino text-sello">No se dictó cantidad</span>}

        <button
          type="button"
          onClick={() => onCambiar({ buscando: !linea.buscando })}
          className="ml-auto text-fino text-boligrafo underline"
        >
          {producto ? 'Cambiar producto' : 'Buscar producto'}
        </button>

        <Boton type="button" tamano="normal" disabled={!listaParaAgregar} onClick={onAgregar}>
          Agregar
        </Boton>
      </div>

      {linea.buscando && (
        <div className="mt-2 flex flex-col gap-1 border-t border-linea pt-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre…"
            className="min-h-[2.25rem] border border-linea-fuerte bg-white px-2 text-fino text-tinta"
          />
          {resultadosBusqueda.map((c) => (
            <button
              key={c.item.id}
              type="button"
              onClick={() => {
                onCambiar({ productoId: c.item.id, buscando: false });
                setBusqueda('');
              }}
              className="w-full border border-linea-fuerte bg-white px-2 py-1 text-left text-fino text-tinta hover:bg-papel-hondo"
            >
              {c.item.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
