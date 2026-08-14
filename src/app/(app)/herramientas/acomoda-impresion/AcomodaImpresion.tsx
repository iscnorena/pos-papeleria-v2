'use client';

import { useMemo, useRef, useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { formatear } from '@/lib/money';
import {
  CONFIG_POR_DEFECTO,
  celdasPorPagina,
  paginaValida,
  tamanoFijoDesborda,
  type Config,
  type Orientacion,
  type Papel,
} from '@/tools/acomoda-impresion/layout-engine';
import { cargarImagen, reordenar, type ImagenDelLote } from '@/tools/acomoda-impresion/imagenes';
import { generarPdf } from '@/tools/acomoda-impresion/pdf';
import {
  calcularTotal,
  PRECIOS_POR_DEFECTO,
  type Precios,
} from '@/tools/acomoda-impresion/precios';
import {
  aPreset,
  desdePreset,
  guardarPreset,
  leerPresets,
} from '@/tools/acomoda-impresion/presets';
import { BuscadorBancos } from './BuscadorBancos';
import { VistaPrevia } from './VistaPrevia';

// §7.4 — dos columnas, como el original. Izquierda con scroll: Imágenes, Configuración,
// Presets y Precios. Derecha: la hoja renderizada y la paginación.

/** Las etiquetas del selector son literalmente estas (§7.3). */
const LAYOUTS: { etiqueta: string; filas: number; columnas: number }[] = [
  { etiqueta: '1 (1×1)', filas: 1, columnas: 1 },
  { etiqueta: '2 (1×2)', filas: 1, columnas: 2 },
  { etiqueta: '4 (2×2)', filas: 2, columnas: 2 },
  { etiqueta: '6 (2×3)', filas: 2, columnas: 3 },
  { etiqueta: '9 (3×3)', filas: 3, columnas: 3 },
];

const CLAVE_PRECIOS = 'acomoda-impresion.precios';

export function AcomodaImpresion() {
  const [config, setConfig] = useState<Config>(CONFIG_POR_DEFECTO);
  const [imagenes, setImagenes] = useState<ImagenDelLote[]>([]);
  const [pagina, setPagina] = useState(0);
  const [esColor, setEsColor] = useState(true);
  const [precios, setPrecios] = useState<Precios>(PRECIOS_POR_DEFECTO);
  const [editandoPrecios, setEditandoPrecios] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const arrastrado = useRef<number | null>(null);

  const porPagina = celdasPorPagina(config);
  const total = useMemo(
    () =>
      calcularTotal({
        totalImagenes: imagenes.length,
        celdasPorPagina: porPagina,
        esColor,
        precios,
      }),
    [imagenes.length, porPagina, esColor, precios],
  );

  const desborda = tamanoFijoDesborda(config);

  /** Cambiar de layout puede dejar la página actual fuera de rango (§7.1). */
  function aplicarConfig(cambios: Partial<Config>) {
    const nueva = { ...config, ...cambios };
    setConfig(nueva);
    setPagina((actual) => paginaValida(nueva, imagenes.length, actual));
  }

  async function agregarArchivos(archivos: FileList | File[]) {
    const lista = Array.from(archivos).filter((a) => a.type.startsWith('image/'));
    if (lista.length === 0) return;
    const cargadas = await Promise.all(lista.map((a) => cargarImagen(a, a.name)));
    setImagenes((actuales) => [...actuales, ...cargadas]);
  }

  function moverImagen(desde: number, hasta: number) {
    setImagenes((actuales) => reordenar(actuales, desde, hasta));
  }

  async function descargarPdf() {
    setGenerando(true);
    setAviso(null);
    try {
      // Aquí, y solo aquí, se tocan los archivos ORIGINALES (§7.8 criterio 12).
      const paraPdf = await Promise.all(
        imagenes.map(async (imagen) => ({
          id: imagen.id,
          aspecto: imagen.aspecto,
          tipo: imagen.tipo,
          bytes: new Uint8Array(await imagen.archivo.arrayBuffer()),
        })),
      );

      const bytes = await generarPdf(config, paraPdf);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'acomodo.pdf';
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso('No se pudo generar el PDF. Revisa que las imágenes sean JPG o PNG.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* ── Columna izquierda ────────────────────────────────────────────────────── */}
      <div className="flex max-h-[80vh] flex-col gap-5 overflow-y-auto pr-2">
        <Seccion titulo="Imágenes">
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer border border-boligrafo-hondo bg-boligrafo px-3 py-1.5 text-base font-medium text-white shadow-impresa">
              Agregar
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) void agregarArchivos(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <Boton variante="secundaria" onClick={() => setBuscando(true)}>
              Buscar
            </Boton>
            <Boton
              variante="secundaria"
              onClick={() => {
                setImagenes([]);
                setPagina(0);
              }}
              disabled={imagenes.length === 0}
            >
              Limpiar
            </Boton>
          </div>

          {/* Zona de soltar archivos. */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length > 0) void agregarArchivos(e.dataTransfer.files);
            }}
            className="mt-3 grid grid-cols-3 gap-2 border border-dashed border-linea-fuerte p-2"
          >
            {imagenes.length === 0 && (
              <p className="col-span-3 py-6 text-center text-fino text-grafito">
                Suelta imágenes aquí
              </p>
            )}
            {imagenes.map((imagen, indice) => (
              <div
                key={imagen.id}
                draggable
                onDragStart={() => (arrastrado.current = indice)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (arrastrado.current !== null) moverImagen(arrastrado.current, indice);
                  arrastrado.current = null;
                }}
                data-prueba="miniatura"
                title={imagen.nombre}
                className="relative cursor-grab border border-linea-fuerte bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura `data:`. */}
                <img
                  src={imagen.miniatura}
                  alt={imagen.nombre}
                  className="h-16 w-full object-cover"
                />
                <span className="absolute left-0 top-0 bg-tinta px-1 font-mono text-micro text-white">
                  {indice + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar ${imagen.nombre}`}
                  onClick={() => setImagenes((a) => a.filter((i) => i.id !== imagen.id))}
                  className="absolute right-0 top-0 bg-sello px-1 font-mono text-micro text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Configuración">
          <Etiqueta texto="Layout">
            <select
              value={`${config.filas}x${config.columnas}`}
              onChange={(e) => {
                const [filas, columnas] = e.target.value.split('x').map(Number);
                aplicarConfig({ filas: filas ?? 1, columnas: columnas ?? 1 });
              }}
              className="w-full border border-linea-fuerte bg-white px-2 py-1.5 text-base"
            >
              {LAYOUTS.map((l) => (
                <option key={l.etiqueta} value={`${l.filas}x${l.columnas}`}>
                  {l.etiqueta}
                </option>
              ))}
              {/* §7.7 — retícula personalizada, además de los cinco layouts fijos. */}
              <option value={`${config.filas}x${config.columnas}`}>
                {`Personalizada (${config.filas}×${config.columnas})`}
              </option>
            </select>
          </Etiqueta>

          <div className="grid grid-cols-2 gap-2">
            <Etiqueta texto="Filas">
              <Numero
                valor={config.filas}
                paso={1}
                min={1}
                onCambio={(v) => aplicarConfig({ filas: v })}
              />
            </Etiqueta>
            <Etiqueta texto="Columnas">
              <Numero
                valor={config.columnas}
                paso={1}
                min={1}
                onCambio={(v) => aplicarConfig({ columnas: v })}
              />
            </Etiqueta>
          </div>

          <Etiqueta texto="Papel">
            <select
              value={config.papel}
              onChange={(e) => aplicarConfig({ papel: e.target.value as Papel })}
              className="w-full border border-linea-fuerte bg-white px-2 py-1.5 text-base"
            >
              <option value="Carta">Carta</option>
              <option value="Oficio">Oficio</option>
              <option value="A4">A4</option>
            </select>
          </Etiqueta>

          <Etiqueta texto="Orientación">
            <select
              value={config.orientacion}
              onChange={(e) => aplicarConfig({ orientacion: e.target.value as Orientacion })}
              className="w-full border border-linea-fuerte bg-white px-2 py-1.5 text-base"
            >
              <option value="Vertical">Vertical</option>
              <option value="Horizontal">Horizontal</option>
            </select>
          </Etiqueta>

          <details className="border border-linea px-2 py-1.5">
            <summary className="cursor-pointer text-base text-tinta">
              Márgenes y espaciado (pulgadas)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Etiqueta texto="Izquierdo">
                <Numero
                  valor={config.margenIzq}
                  paso={0.05}
                  max={1}
                  onCambio={(v) => aplicarConfig({ margenIzq: v })}
                />
              </Etiqueta>
              <Etiqueta texto="Derecho">
                <Numero
                  valor={config.margenDer}
                  paso={0.05}
                  max={1}
                  onCambio={(v) => aplicarConfig({ margenDer: v })}
                />
              </Etiqueta>
              <Etiqueta texto="Superior">
                <Numero
                  valor={config.margenSup}
                  paso={0.05}
                  max={1}
                  onCambio={(v) => aplicarConfig({ margenSup: v })}
                />
              </Etiqueta>
              <Etiqueta texto="Inferior">
                <Numero
                  valor={config.margenInf}
                  paso={0.05}
                  max={1}
                  onCambio={(v) => aplicarConfig({ margenInf: v })}
                />
              </Etiqueta>
              <Etiqueta texto="Espaciado">
                <Numero
                  valor={config.espaciado}
                  paso={0.05}
                  max={1}
                  onCambio={(v) => aplicarConfig({ espaciado: v })}
                />
              </Etiqueta>
              <Etiqueta texto="DPI">
                <Numero
                  valor={config.dpi}
                  paso={50}
                  min={72}
                  max={1200}
                  onCambio={(v) => aplicarConfig({ dpi: v })}
                />
              </Etiqueta>
            </div>
          </details>

          <Casilla
            texto="Mostrar guías de corte"
            valor={config.mostrarGuias}
            onCambio={(v) => aplicarConfig({ mostrarGuias: v })}
          />
          <Casilla
            texto="Girar imágenes"
            valor={config.rotar}
            onCambio={(v) => aplicarConfig({ rotar: v })}
          />
          <Casilla
            texto="Maximizar imágenes"
            valor={config.maximizar}
            onCambio={(v) => aplicarConfig({ maximizar: v })}
          />
          <Casilla
            texto="Usar tamaño fijo"
            valor={config.usarTamanoFijo}
            onCambio={(v) => aplicarConfig({ usarTamanoFijo: v })}
          />

          {config.usarTamanoFijo && (
            <div className="grid grid-cols-2 gap-2">
              <Etiqueta texto="Ancho (cm)">
                <Numero
                  valor={config.anchoFijoCm}
                  paso={0.5}
                  onCambio={(v) => aplicarConfig({ anchoFijoCm: v })}
                />
              </Etiqueta>
              <Etiqueta texto="Alto (cm)">
                <Numero
                  valor={config.altoFijoCm}
                  paso={0.5}
                  onCambio={(v) => aplicarConfig({ altoFijoCm: v })}
                />
              </Etiqueta>
            </div>
          )}

          {/* §7.7 — el original dejaba que se desbordara en silencio. */}
          {desborda && (
            <Aviso tono="error">
              El tamaño fijo no cabe en la celda: la imagen se va a salir. Baja el tamaño o usa
              menos celdas por hoja.
            </Aviso>
          )}
        </Seccion>

        <Seccion titulo="Presets">
          <Presets config={config} onCargar={(c) => aplicarConfig(c)} onAviso={setAviso} />
        </Seccion>

        <Seccion titulo="Precios">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEsColor(true)}
              aria-pressed={esColor}
              className={
                esColor
                  ? 'flex-1 border border-boligrafo-hondo bg-boligrafo px-2 py-1.5 text-base text-white'
                  : 'flex-1 border border-linea-fuerte bg-white px-2 py-1.5 text-base text-tinta'
              }
            >
              Color
            </button>
            <button
              type="button"
              onClick={() => setEsColor(false)}
              aria-pressed={!esColor}
              className={
                !esColor
                  ? 'flex-1 border border-boligrafo-hondo bg-boligrafo px-2 py-1.5 text-base text-white'
                  : 'flex-1 border border-linea-fuerte bg-white px-2 py-1.5 text-base text-tinta'
              }
            >
              Blanco y negro
            </button>
          </div>

          <p className="mt-3 flex items-baseline justify-between">
            <span className="text-cuerpo text-grafito">Total:</span>
            <span
              data-prueba="total"
              className="tabular font-display text-cifra font-semibold text-tinta"
            >
              {formatear(total)}
            </span>
          </p>

          <Boton
            variante="secundaria"
            className="mt-2 w-full"
            onClick={() => setEditandoPrecios((v) => !v)}
          >
            Configurar precios
          </Boton>

          {editandoPrecios && (
            <EditorPrecios
              precios={precios}
              onCambio={(nuevos) => {
                setPrecios(nuevos);
                // Los precios son de ESTE equipo, no del negocio (§7.2).
                window.localStorage.setItem(CLAVE_PRECIOS, JSON.stringify(nuevos));
              }}
            />
          )}
        </Seccion>

        <Boton
          tamano="tecla"
          className="w-full"
          disabled={imagenes.length === 0 || generando}
          onClick={() => void descargarPdf()}
        >
          {generando ? 'Generando…' : 'Generar PDF'}
        </Boton>

        {aviso && <Aviso tono="error">{aviso}</Aviso>}
      </div>

      {/* ── Columna derecha ──────────────────────────────────────────────────────── */}
      <VistaPrevia
        config={config}
        imagenes={imagenes}
        pagina={pagina}
        onCambiarPagina={(p) => setPagina(paginaValida(config, imagenes.length, p))}
        onSoltarSobre={(destino) => {
          if (arrastrado.current !== null) moverImagen(arrastrado.current, destino);
          arrastrado.current = null;
        }}
      />

      <BuscadorBancos
        abierto={buscando}
        onCerrar={() => setBuscando(false)}
        onAgregar={(blobs) => {
          void (async () => {
            const cargadas = await Promise.all(
              blobs.map((b, i) => cargarImagen(b, `banco-${Date.now()}-${i}.jpg`)),
            );
            setImagenes((actuales) => [...actuales, ...cargadas]);
            setBuscando(false);
          })();
        }}
      />
    </div>
  );
}

function Presets({
  config,
  onCargar,
  onAviso,
}: {
  config: Config;
  onCargar: (config: Config) => void;
  onAviso: (mensaje: string | null) => void;
}) {
  const [nombre, setNombre] = useState('Sin nombre');
  const [guardados, setGuardados] = useState<string[]>(() => Object.keys(leerPresets()));

  return (
    <div className="flex flex-col gap-2">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        aria-label="Nombre del preset"
        className="border border-linea-fuerte bg-white px-2 py-1.5 text-base"
      />

      <div className="flex flex-wrap gap-2">
        <Boton
          variante="secundaria"
          onClick={() => {
            guardarPreset(nombre, config);
            setGuardados(Object.keys(leerPresets()));
            onAviso(null);
          }}
        >
          Guardar
        </Boton>

        <select
          aria-label="Preset guardado"
          onChange={(e) => {
            const preset = leerPresets()[e.target.value];
            if (preset) onCargar(desdePreset(preset).config);
          }}
          className="border border-linea-fuerte bg-white px-2 py-1.5 text-base"
          defaultValue=""
        >
          <option value="">Cargar…</option>
          {guardados.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Exportar e importar `.json` con el formato exacto de la app de escritorio (§7.5). */}
        <Boton
          variante="secundaria"
          onClick={() => {
            const blob = new Blob([JSON.stringify(aPreset(config, nombre), null, 2)], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const enlace = document.createElement('a');
            enlace.href = url;
            enlace.download = `${nombre}.json`;
            enlace.click();
            URL.revokeObjectURL(url);
          }}
        >
          Exportar
        </Boton>

        <label className="cursor-pointer border border-linea-fuerte bg-white px-3 py-1.5 text-base text-tinta shadow-impresa">
          Importar
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const archivo = e.target.files?.[0];
              e.target.value = '';
              if (!archivo) return;
              try {
                const { config: cargada, nombre: cargado } = desdePreset(
                  JSON.parse(await archivo.text()),
                );
                onCargar(cargada);
                setNombre(cargado);
                onAviso(null);
              } catch {
                onAviso('Ese archivo no es un preset válido.');
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}

function EditorPrecios({
  precios,
  onCambio,
}: {
  precios: Precios;
  onCambio: (precios: Precios) => void;
}) {
  return (
    <div className="mt-3 border border-linea p-2">
      <p className="mb-2 font-mono text-micro uppercase text-grafito">Color, por imagen</p>
      {Object.keys(precios.color)
        .map(Number)
        .sort((a, b) => a - b)
        .map((celdas) => (
          <Etiqueta key={celdas} texto={`${celdas} por hoja`}>
            <Numero
              valor={(precios.color[celdas] ?? 0) / 100}
              paso={0.5}
              onCambio={(v) =>
                onCambio({ ...precios, color: { ...precios.color, [celdas]: Math.round(v * 100) } })
              }
            />
          </Etiqueta>
        ))}
      <p className="mb-2 mt-3 font-mono text-micro uppercase text-grafito">
        Blanco y negro, por hoja
      </p>
      <Numero
        valor={precios.blancoYNegro / 100}
        paso={0.5}
        onCambio={(v) => onCambio({ ...precios, blancoYNegro: Math.round(v * 100) })}
      />
    </div>
  );
}

// ── Piezas pequeñas ────────────────────────────────────────────────────────────────

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
      <h2 className="mb-3 font-mono text-micro uppercase text-grafito">{titulo}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Etiqueta({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-fino text-grafito">{texto}</span>
      {children}
    </label>
  );
}

/** Campo numérico con botoncitos ▲▼, como el original (§7.4). */
function Numero({
  valor,
  paso,
  min = 0,
  max,
  onCambio,
}: {
  valor: number;
  paso: number;
  min?: number;
  max?: number;
  onCambio: (valor: number) => void;
}) {
  const acotar = (v: number) => {
    const acotado = Math.max(min, max === undefined ? v : Math.min(max, v));
    // Se redondea a dos decimales: sumar 0.05 en coma flotante deja 0.30000000000000004.
    return Math.round(acotado * 100) / 100;
  };

  return (
    <span className="flex">
      <input
        type="text"
        inputMode="decimal"
        value={valor}
        onChange={(e) => {
          const numero = Number(e.target.value);
          if (Number.isFinite(numero)) onCambio(acotar(numero));
        }}
        className="tabular w-full border border-linea-fuerte bg-white px-2 py-1 text-right font-mono text-base"
      />
      <span className="flex flex-col">
        <button
          type="button"
          aria-label="Aumentar"
          onClick={() => onCambio(acotar(valor + paso))}
          className="border border-l-0 border-linea-fuerte px-1 text-micro leading-none"
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="Disminuir"
          onClick={() => onCambio(acotar(valor - paso))}
          className="border border-l-0 border-t-0 border-linea-fuerte px-1 text-micro leading-none"
        >
          ▼
        </button>
      </span>
    </span>
  );
}

function Casilla({
  texto,
  valor,
  onCambio,
}: {
  texto: string;
  valor: boolean;
  onCambio: (valor: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-base text-tinta">
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => onCambio(e.target.checked)}
        className="border-linea-fuerte text-boligrafo"
      />
      {texto}
    </label>
  );
}
