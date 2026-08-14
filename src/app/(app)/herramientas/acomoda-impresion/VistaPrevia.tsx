'use client';

import { useMemo } from 'react';

import {
  celdasDePagina,
  tamanoPagina,
  totalPaginas,
  type Config,
} from '@/tools/acomoda-impresion/layout-engine';
import type { ImagenDelLote } from '@/tools/acomoda-impresion/imagenes';

// La hoja renderizada a escala. Consume `celdasDePagina`, el MISMO arreglo que usa el PDF
// (§7.1): lo único que cambia entre pantalla y papel es el factor de escala.

const ANCHO_EN_PANTALLA = 520; // px

export function VistaPrevia({
  config,
  imagenes,
  pagina,
  onCambiarPagina,
  onSoltarSobre,
}: {
  config: Config;
  imagenes: ImagenDelLote[];
  pagina: number;
  onCambiarPagina: (pagina: number) => void;
  onSoltarSobre: (indiceDestino: number) => void;
}) {
  const { ancho: anchoPagina, alto: altoPagina } = tamanoPagina(config);
  const escala = ANCHO_EN_PANTALLA / anchoPagina;

  const celdas = useMemo(
    () => celdasDePagina(config, imagenes, pagina),
    [config, imagenes, pagina],
  );

  const paginas = totalPaginas(config, imagenes.length);
  const porMiniatura = new Map(imagenes.map((i) => [i.id, i]));
  const indiceInicial = pagina * config.filas * config.columnas;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative border border-linea-fuerte bg-white shadow-alzada"
        style={{ width: anchoPagina * escala, height: altoPagina * escala }}
        aria-label={`Hoja ${pagina + 1} de ${paginas}`}
      >
        {celdas.map(({ celda, imagen, imagenId, rotada, deformar }, indice) => {
          const datos = imagenId ? porMiniatura.get(imagenId) : null;

          return (
            <div key={indice}>
              {/* Celda vacía: fondo #F5F5F5 y borde #E0E0E0 (§7.1). */}
              {!imagen && (
                <div
                  className="absolute"
                  style={{
                    left: celda.x * escala,
                    top: celda.y * escala,
                    width: celda.ancho * escala,
                    height: celda.alto * escala,
                    background: '#F5F5F5',
                    border: '1px solid #E0E0E0',
                  }}
                />
              )}

              {imagen && datos && (
                // Soltar una imagen sobre otra las reordena (§7.4), igual que arrastrar en
                // la lista lateral.
                <div
                  className="absolute"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onSoltarSobre(indiceInicial + indice);
                  }}
                  style={{
                    left: imagen.x * escala,
                    top: imagen.y * escala,
                    width: imagen.ancho * escala,
                    height: imagen.alto * escala,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- es una miniatura
                      `data:` generada en el navegador; `next/image` no aporta nada aquí. */}
                  <img
                    src={datos.miniatura}
                    alt={datos.nombre}
                    className="h-full w-full"
                    style={{
                      objectFit: deformar ? 'fill' : 'contain',
                      transform: rotada ? 'rotate(90deg)' : undefined,
                    }}
                  />
                </div>
              )}

              {/* Guía de corte: borde punteado de LA CELDA, gris, patrón 4 2, 1px en
                  pantalla (§7.1). */}
              {config.mostrarGuias && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: celda.x * escala,
                    top: celda.y * escala,
                    width: celda.ancho * escala,
                    height: celda.alto * escala,
                    border: '1px dashed #808080',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onCambiarPagina(pagina - 1)}
          disabled={pagina <= 0}
          className="border border-linea-fuerte bg-white px-3 py-1.5 text-base text-tinta shadow-impresa disabled:opacity-40"
        >
          ◀ Anterior
        </button>
        <span className="font-mono text-base text-tinta" data-prueba="paginacion">
          Página {pagina + 1} de {paginas}
        </span>
        <button
          type="button"
          onClick={() => onCambiarPagina(pagina + 1)}
          disabled={pagina >= paginas - 1}
          className="border border-linea-fuerte bg-white px-3 py-1.5 text-base text-tinta shadow-impresa disabled:opacity-40"
        >
          Siguiente ▶
        </button>
      </div>
    </div>
  );
}
