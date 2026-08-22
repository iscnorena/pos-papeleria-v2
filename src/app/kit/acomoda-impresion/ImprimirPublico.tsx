'use client';

import { useState, type ReactNode } from 'react';

import { CabeceraPublica } from '@/components/CabeceraPublica';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { useIdioma } from '@/lib/i18n/cliente';
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

export function ImprimirPublico({ whatsappNumber }: { whatsappNumber: string }) {
  const { t } = useIdioma();
  const [imagenes, setImagenes] = useState<ImagenDelLote[]>([]);
  const [config, setConfig] = useState<Config>({
    ...CONFIG_POR_DEFECTO,
    orientacion: 'Horizontal',
  });
  const [pagina, setPagina] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const LAYOUTS: { etiqueta: string; filas: number; columnas: number }[] = [
    { etiqueta: t('acomoda.layout1Foto'), filas: 1, columnas: 1 },
    { etiqueta: t('acomoda.layout2Fotos'), filas: 1, columnas: 2 },
    { etiqueta: t('acomoda.layout4Fotos'), filas: 2, columnas: 2 },
    { etiqueta: t('acomoda.layout6Fotos'), filas: 2, columnas: 3 },
  ];

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
      setAviso(t('acomoda.maxFotos', { n: LIMITE_IMAGENES }));
      return;
    }
    const recortada = lista.slice(0, cabida);
    if (recortada.length < lista.length) {
      setAviso(t('acomoda.soloSeAgregaron', { n: recortada.length, max: LIMITE_IMAGENES }));
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
        archivos: [{ bytes, nombreArchivo: 'impresion.pdf' }],
        whatsappNumber,
        tituloCompartir: t('acomoda.whatsappTitulo'),
        textoCompartir: t('acomoda.whatsappTexto'),
        textoRespaldo: t('acomoda.whatsappRespaldo'),
      });
    } catch {
      setAviso(t('acomoda.errorGenerarPdfFotos'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <CabeceraPublica
        titulo={t('acomoda.tituloPublico')}
        descripcion={t('acomoda.descPublico')}
        volver={{ href: '/kit', texto: t('nav.herramientas') }}
      />

      <div className="flex flex-col gap-5">
        <Seccion titulo={t('acomoda.tusFotos')}>
          <p className="text-fino text-grafito">{t('acomoda.seProcesanAqui')}</p>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-tecla flex-1 cursor-pointer items-center justify-center border border-boligrafo-hondo bg-boligrafo px-4 text-center text-cuerpo font-medium text-white shadow-impresa">
              {t('acomoda.agregarFotos')}
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
              {t('acomoda.buscarGratis')}
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
                    aria-label={t('acomoda.subirNombre', { nombre: imagen.nombre })}
                    disabled={indice === 0}
                    onClick={() => moverImagen(indice, -1)}
                    className="px-2 py-1 text-base text-tinta disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={t('acomoda.bajarNombre', { nombre: imagen.nombre })}
                    disabled={indice === imagenes.length - 1}
                    onClick={() => moverImagen(indice, 1)}
                    className="px-2 py-1 text-base text-tinta disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={t('acomoda.quitarNombre', { nombre: imagen.nombre })}
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

        <Seccion titulo={t('acomoda.cuantasFotosPorHoja')}>
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
              <span className="text-fino text-grafito">{t('acomoda.papel')}</span>
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
              <span className="text-fino text-grafito">{t('acomoda.orientacion')}</span>
              <select
                value={config.orientacion}
                onChange={(e) => aplicarConfig({ orientacion: e.target.value as Orientacion })}
                className="min-h-tecla border border-linea-fuerte bg-white px-2 text-base"
              >
                <option value="Vertical">{t('acomoda.vertical')}</option>
                <option value="Horizontal">{t('acomoda.horizontal')}</option>
              </select>
            </label>
          </div>
        </Seccion>

        {imagenes.length > 0 && (
          <Seccion titulo={t('acomoda.vistaPrevia')}>
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
          {enviando ? t('acomoda.preparando') : t('acomoda.enviarPorWhatsapp')}
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
                t('acomoda.soloSeAgregaron', { n: recortados.length, max: LIMITE_IMAGENES }),
              );
            }
          })();
        }}
      />
    </div>
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
