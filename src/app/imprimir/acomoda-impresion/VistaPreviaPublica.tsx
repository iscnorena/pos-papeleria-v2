'use client';

import {
  celdasDePagina,
  tamanoPagina,
  totalPaginas,
  type Config,
} from '@/tools/acomoda-impresion/layout-engine';
import type { ImagenDelLote } from '@/tools/acomoda-impresion/imagenes';

// Misma retícula que la interna (`celdasDePagina`, §7.1) pero posicionada en PORCENTAJES
// del tamaño de página en vez de un ancho fijo en px: así se adapta a cualquier celular sin
// medir nada en JS.

export function VistaPreviaPublica({
  config,
  imagenes,
  pagina,
  onCambiarPagina,
}: {
  config: Config;
  imagenes: ImagenDelLote[];
  pagina: number;
  onCambiarPagina: (pagina: number) => void;
}) {
  const { ancho: anchoPagina, alto: altoPagina } = tamanoPagina(config);

  const celdas = celdasDePagina(config, imagenes, pagina);

  const paginas = totalPaginas(config, imagenes.length);
  const porMiniatura = new Map(imagenes.map((i) => [i.id, i]));
  const pct = (valor: number, total: number) => `${(valor / total) * 100}%`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative mx-auto w-full max-w-sm border border-linea-fuerte bg-white shadow-alzada"
        style={{ aspectRatio: `${anchoPagina} / ${altoPagina}` }}
        aria-label={`Hoja ${pagina + 1} de ${paginas}`}
      >
        {celdas.map(({ celda, imagen, imagenId, rotada, deformar }, indice) => {
          const datos = imagenId ? porMiniatura.get(imagenId) : null;

          return (
            <div key={indice}>
              {!imagen && (
                <div
                  className="absolute bg-[#F5F5F5]"
                  style={{
                    left: pct(celda.x, anchoPagina),
                    top: pct(celda.y, altoPagina),
                    width: pct(celda.ancho, anchoPagina),
                    height: pct(celda.alto, altoPagina),
                    border: '1px solid #E0E0E0',
                  }}
                />
              )}

              {imagen && datos && (
                <div
                  className="absolute"
                  style={{
                    left: pct(imagen.x, anchoPagina),
                    top: pct(imagen.y, altoPagina),
                    width: pct(imagen.ancho, anchoPagina),
                    height: pct(imagen.alto, altoPagina),
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura `data:`
                      generada en el navegador. */}
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

              {config.mostrarGuias && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: pct(celda.x, anchoPagina),
                    top: pct(celda.y, altoPagina),
                    width: pct(celda.ancho, anchoPagina),
                    height: pct(celda.alto, altoPagina),
                    border: '1px dashed #808080',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {paginas > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onCambiarPagina(pagina - 1)}
            disabled={pagina <= 0}
            className="min-h-tecla border border-linea-fuerte bg-white px-3 text-base text-tinta shadow-impresa disabled:opacity-40"
          >
            ◀
          </button>
          <span className="font-mono text-base text-tinta" data-prueba="paginacion">
            Hoja {pagina + 1} de {paginas}
          </span>
          <button
            type="button"
            onClick={() => onCambiarPagina(pagina + 1)}
            disabled={pagina >= paginas - 1}
            className="min-h-tecla border border-linea-fuerte bg-white px-3 text-base text-tinta shadow-impresa disabled:opacity-40"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
