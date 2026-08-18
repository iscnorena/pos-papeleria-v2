'use client';

import { useState, type ReactNode } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import {
  CONFIG_POR_DEFECTO,
  paginaValida,
  type Config,
  type Orientacion,
  type Papel,
} from '@/tools/acomoda-impresion/layout-engine';
import { cargarImagen, reordenar, type ImagenDelLote } from '@/tools/acomoda-impresion/imagenes';
import { generarPdf } from '@/tools/acomoda-impresion/pdf';
import { BuscadorBancosPublico } from './BuscadorBancosPublico';
import { VistaPreviaPublica } from './VistaPreviaPublica';

// Versión pública y simplificada de AcomodaImpresion.tsx (§7.4): una sola columna, sin
// precios, sin márgenes/DPI/presets — esos son "del equipo", no del cliente que solo
// quiere mandar sus fotos a imprimir. Reutiliza los mismos módulos puros de
// `src/tools/acomoda-impresion/` que la herramienta interna.

const LIMITE_IMAGENES = 20;

const LAYOUTS: { etiqueta: string; filas: number; columnas: number }[] = [
  { etiqueta: '1 foto', filas: 1, columnas: 1 },
  { etiqueta: '2 fotos', filas: 1, columnas: 2 },
  { etiqueta: '4 fotos', filas: 2, columnas: 2 },
  { etiqueta: '6 fotos', filas: 2, columnas: 3 },
];

const CONFIG_INICIAL: Config = { ...CONFIG_POR_DEFECTO, orientacion: 'Horizontal' };

export function ImprimirPublico({
  nombreNegocio,
  whatsappNumber,
}: {
  nombreNegocio: string;
  whatsappNumber: string;
}) {
  const [imagenes, setImagenes] = useState<ImagenDelLote[]>([]);
  const [config, setConfig] = useState<Config>(CONFIG_INICIAL);
  const [pagina, setPagina] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function aplicarConfig(cambios: Partial<Config>) {
    const nueva = { ...config, ...cambios };
    setConfig(nueva);
    setPagina((actual) => paginaValida(nueva, imagenes.length, actual));
  }

  async function agregarArchivos(archivos: FileList | File[]) {
    const lista = Array.from(archivos).filter((a) => a.type.startsWith('image/'));
    if (lista.length === 0) return;

    const cabida = LIMITE_IMAGENES - imagenes.length;
    if (cabida <= 0) {
      setAviso(`Ya tienes el máximo de ${LIMITE_IMAGENES} fotos.`);
      return;
    }
    const recortada = lista.slice(0, cabida);
    if (recortada.length < lista.length) {
      setAviso(`Solo se agregaron ${recortada.length}: el máximo es ${LIMITE_IMAGENES} fotos.`);
    }
    const cargadas = await Promise.all(recortada.map((a) => cargarImagen(a, a.name)));
    setImagenes((actuales) => [...actuales, ...cargadas]);
  }

  function moverImagen(indice: number, delta: number) {
    setImagenes((actuales) => reordenar(actuales, indice, indice + delta));
  }

  function quitarImagen(id: string) {
    setImagenes((actuales) => actuales.filter((i) => i.id !== id));
  }

  async function enviarPorWhatsapp() {
    if (imagenes.length === 0) return;
    setEnviando(true);
    setAviso(null);
    try {
      // Igual que en la herramienta interna: los archivos ORIGINALES solo se tocan aquí.
      const paraPdf = await Promise.all(
        imagenes.map(async (imagen) => ({
          id: imagen.id,
          aspecto: imagen.aspecto,
          tipo: imagen.tipo,
          bytes: new Uint8Array(await imagen.archivo.arrayBuffer()),
        })),
      );
      const bytes = await generarPdf(config, paraPdf);
      await compartirPdfPorWhatsapp({
        bytes,
        nombreArchivo: 'impresion.pdf',
        whatsappNumber,
        tituloCompartir: 'Impresión',
        textoCompartir: 'Hola, les mando este archivo para imprimir 🖨️',
        textoRespaldo:
          'Hola, les mando mi archivo para imprimir 🖨️ (acabo de descargar el PDF, se los adjunto aquí).',
      });
    } catch {
      setAviso('No se pudo generar el PDF. Revisa que las fotos sean JPG o PNG.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-dvh bg-papel pb-10">
      <header className="border-b border-linea-fuerte bg-white px-4 py-3">
        <h1 className="font-display text-cuerpo font-semibold text-tinta">{nombreNegocio}</h1>
        <p className="text-fino text-grafito">Arma tu impresión y mándala por WhatsApp</p>
      </header>

      <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <Seccion titulo="Tus fotos">
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-tecla flex-1 cursor-pointer items-center justify-center border border-boligrafo-hondo bg-boligrafo px-4 text-center text-cuerpo font-medium text-white shadow-impresa">
              Agregar fotos
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
            <Boton tamano="tecla" variante="secundaria" onClick={() => setBuscando(true)}>
              Buscar gratis
            </Boton>
          </div>

          {imagenes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {imagenes.map((imagen, indice) => (
                <li
                  key={imagen.id}
                  className="flex items-center gap-2 border border-linea-fuerte bg-white p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura `data:`
                      generada en el navegador. */}
                  <img
                    src={imagen.miniatura}
                    alt={imagen.nombre}
                    className="h-14 w-14 flex-shrink-0 object-cover"
                  />
                  <span className="flex-1 truncate text-fino text-tinta">{imagen.nombre}</span>
                  <button
                    type="button"
                    aria-label={`Subir ${imagen.nombre}`}
                    disabled={indice === 0}
                    onClick={() => moverImagen(indice, -1)}
                    className="px-2 py-1 text-base text-tinta disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${imagen.nombre}`}
                    disabled={indice === imagenes.length - 1}
                    onClick={() => moverImagen(indice, 1)}
                    className="px-2 py-1 text-base text-tinta disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Quitar ${imagen.nombre}`}
                    onClick={() => quitarImagen(imagen.id)}
                    className="px-2 py-1 text-base text-sello"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="¿Cuántas fotos por hoja?">
          <div className="grid grid-cols-2 gap-2">
            {LAYOUTS.map((l) => {
              const activo = config.filas === l.filas && config.columnas === l.columnas;
              return (
                <button
                  key={l.etiqueta}
                  type="button"
                  onClick={() => aplicarConfig({ filas: l.filas, columnas: l.columnas })}
                  aria-pressed={activo}
                  className={
                    activo
                      ? 'min-h-tecla border border-boligrafo-hondo bg-boligrafo text-cuerpo font-medium text-white shadow-impresa'
                      : 'min-h-tecla border border-linea-fuerte bg-white text-cuerpo text-tinta shadow-impresa'
                  }
                >
                  {l.etiqueta}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-fino text-grafito">Papel</span>
              <select
                value={config.papel}
                onChange={(e) => aplicarConfig({ papel: e.target.value as Papel })}
                className="min-h-tecla border border-linea-fuerte bg-white px-2 text-base"
              >
                <option value="Carta">Carta</option>
                <option value="Oficio">Oficio</option>
                <option value="A4">A4</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fino text-grafito">Orientación</span>
              <select
                value={config.orientacion}
                onChange={(e) => aplicarConfig({ orientacion: e.target.value as Orientacion })}
                className="min-h-tecla border border-linea-fuerte bg-white px-2 text-base"
              >
                <option value="Vertical">Vertical</option>
                <option value="Horizontal">Horizontal</option>
              </select>
            </label>
          </div>
        </Seccion>

        {imagenes.length > 0 && (
          <Seccion titulo="Vista previa">
            <VistaPreviaPublica
              config={config}
              imagenes={imagenes}
              pagina={pagina}
              onCambiarPagina={(p) => setPagina(paginaValida(config, imagenes.length, p))}
            />
          </Seccion>
        )}

        {aviso && <Aviso tono="error">{aviso}</Aviso>}

        <Boton
          tamano="tecla"
          className="w-full"
          disabled={imagenes.length === 0 || enviando}
          onClick={() => void enviarPorWhatsapp()}
        >
          {enviando ? 'Preparando…' : 'Enviar por WhatsApp'}
        </Boton>
      </div>

      <BuscadorBancosPublico
        abierto={buscando}
        onCerrar={() => setBuscando(false)}
        onAgregar={(blobs) => {
          void (async () => {
            const cabida = LIMITE_IMAGENES - imagenes.length;
            const recortados = blobs.slice(0, Math.max(0, cabida));
            const cargadas = await Promise.all(
              recortados.map((b, i) => cargarImagen(b, `banco-${Date.now()}-${i}.jpg`)),
            );
            setImagenes((actuales) => [...actuales, ...cargadas]);
            setBuscando(false);
            if (recortados.length < blobs.length) {
              setAviso(
                `Solo se agregaron ${recortados.length}: el máximo es ${LIMITE_IMAGENES} fotos.`,
              );
            }
          })();
        }}
      />
    </main>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
      <h2 className="mb-3 font-mono text-micro uppercase text-grafito">{titulo}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
