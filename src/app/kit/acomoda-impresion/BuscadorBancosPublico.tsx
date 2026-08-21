'use client';

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import type { ImagenDeBanco } from '@/lib/bancosImagenes';

// Igual que `BuscadorBancos.tsx` (herramienta interna, §7.6), pero contra las rutas
// públicas de /api/kit/*, limitadas por IP en vez de por sesión.

const PROVEEDORES = [
  { id: 'unsplash', nombre: 'Unsplash' },
  { id: 'pexels', nombre: 'Pexels' },
  { id: 'pixabay', nombre: 'Pixabay' },
] as const;

export function BuscadorBancosPublico({
  abierto,
  onCerrar,
  onAgregar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onAgregar: (imagenes: Blob[]) => void;
}) {
  const [proveedor, setProveedor] = useState<string>('unsplash');
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<ImagenDeBanco[]>([]);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function buscar() {
    setCargando(true);
    setError(null);
    setResultados([]);
    setMarcadas(new Set());
    try {
      const respuesta = await fetch(
        `/api/kit/bancos-imagenes?proveedor=${proveedor}&texto=${encodeURIComponent(texto)}&cuantos=9`,
      );
      const datos = (await respuesta.json()) as { resultados?: ImagenDeBanco[]; error?: string };
      if (!respuesta.ok) setError(datos.error ?? 'No se pudo buscar.');
      else setResultados(datos.resultados ?? []);
    } catch {
      setError('No se pudo buscar. Revisa la conexión.');
    } finally {
      setCargando(false);
    }
  }

  async function agregarMarcadas() {
    setCargando(true);
    try {
      const blobs = await Promise.all(
        resultados
          .filter((r) => marcadas.has(r.id))
          .map(async (r) => {
            const respuesta = await fetch(
              `/api/kit/bancos-imagenes/descargar?url=${encodeURIComponent(r.largeImageUrl)}`,
            );
            if (!respuesta.ok) throw new Error('descarga');
            return respuesta.blob();
          }),
      );
      onAgregar(blobs);
    } catch {
      setError('No se pudieron traer las imágenes. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Buscar imágenes gratis">
      <div className="flex flex-col gap-2">
        <select
          aria-label="Banco de imágenes"
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
          className="min-h-tecla border border-linea-fuerte bg-white px-2 text-base"
        >
          {PROVEEDORES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            aria-label="Qué buscar"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void buscar();
              }
            }}
            placeholder="Ej. flores, paisaje, perros…"
            className="min-h-tecla flex-1 border border-linea-fuerte bg-white px-2 text-base"
          />
          <Boton
            tamano="tecla"
            onClick={() => void buscar()}
            disabled={cargando || texto.trim() === ''}
          >
            Buscar
          </Boton>
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {resultados.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {resultados.map((r) => {
            const marcada = marcadas.has(r.id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    const nuevas = new Set(marcadas);
                    if (marcada) nuevas.delete(r.id);
                    else nuevas.add(r.id);
                    setMarcadas(nuevas);
                  }}
                  aria-pressed={marcada}
                  className={
                    marcada
                      ? 'block w-full border-2 border-boligrafo'
                      : 'block w-full border border-linea-fuerte'
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota
                      del banco. */}
                  <img src={r.previewUrl} alt={r.tags} className="h-20 w-full object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex gap-2">
        <Boton
          tamano="tecla"
          onClick={() => void agregarMarcadas()}
          disabled={marcadas.size === 0 || cargando}
        >
          Agregar {marcadas.size > 0 ? `(${marcadas.size})` : ''}
        </Boton>
        <Boton tamano="tecla" variante="secundaria" onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>
    </Modal>
  );
}
