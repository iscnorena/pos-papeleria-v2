'use client';

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import type { ImagenDeBanco } from '@/lib/bancosImagenes';

// §7.6 — buscador de bancos de imágenes. Los tres proveedores en este orden, y las llaves
// nunca llegan al navegador: todo pasa por el Route Handler.

const PROVEEDORES = [
  { id: 'unsplash', nombre: 'Unsplash' },
  { id: 'pexels', nombre: 'Pexels' },
  { id: 'pixabay', nombre: 'Pixabay' },
] as const;

export function BuscadorBancos({
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
  const [cuantos, setCuantos] = useState(4);
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
        `/api/herramientas/bancos-imagenes?proveedor=${proveedor}&texto=${encodeURIComponent(texto)}&cuantos=${cuantos}`,
      );
      const datos = (await respuesta.json()) as { resultados?: ImagenDeBanco[]; error?: string };

      // Sin llave configurada, el mensaje se muestra y no se lanza ninguna excepción
      // (§7.8 criterio 10).
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
      // La descarga también pasa por el servidor, para evitar CORS (§7.6).
      const blobs = await Promise.all(
        resultados
          .filter((r) => marcadas.has(r.id))
          .map(async (r) => {
            const respuesta = await fetch(
              `/api/herramientas/bancos-imagenes/descargar?url=${encodeURIComponent(r.largeImageUrl)}`,
            );
            if (!respuesta.ok) throw new Error('descarga');
            return respuesta.blob();
          }),
      );
      onAgregar(blobs);
    } catch {
      setError('No se pudieron traer las imágenes.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Buscar en bancos de imágenes">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Proveedor"
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
          className="border border-linea-fuerte bg-white px-2 py-1.5 text-base"
        >
          {PROVEEDORES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

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
          placeholder="gato"
          className="flex-1 border border-linea-fuerte bg-white px-2 py-1.5 text-base"
        />

        <input
          type="number"
          aria-label="Cuántos resultados"
          min={1}
          max={20}
          value={cuantos}
          onChange={(e) => setCuantos(Math.min(20, Math.max(1, Number(e.target.value) || 4)))}
          className="tabular w-16 border border-linea-fuerte bg-white px-2 py-1.5 text-right font-mono text-base"
        />

        <Boton onClick={() => void buscar()} disabled={cargando || texto.trim() === ''}>
          Buscar
        </Boton>
      </div>

      {error && (
        <div className="mt-3">
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      {resultados.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {resultados.map((r) => (
            <li key={r.id}>
              <label className="block cursor-pointer border border-linea-fuerte">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota
                    del banco; `next/image` exigiría configurar cada dominio. */}
                <img src={r.previewUrl} alt={r.tags} className="h-20 w-full object-cover" />
                <span className="flex items-center gap-1 p-1">
                  <input
                    type="checkbox"
                    checked={marcadas.has(r.id)}
                    onChange={(e) => {
                      const nuevas = new Set(marcadas);
                      if (e.target.checked) nuevas.add(r.id);
                      else nuevas.delete(r.id);
                      setMarcadas(nuevas);
                    }}
                  />
                  <span className="truncate text-micro text-grafito">{r.tags || 'sin título'}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex gap-2">
        <Boton onClick={() => void agregarMarcadas()} disabled={marcadas.size === 0 || cargando}>
          Agregar {marcadas.size > 0 ? `(${marcadas.size})` : ''}
        </Boton>
        <Boton variante="secundaria" onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>
    </Modal>
  );
}
