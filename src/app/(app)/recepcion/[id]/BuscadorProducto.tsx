'use client';

import { useEffect, useState, useTransition } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import {
  crearProductoDesdeLinea,
  sugerirProductos,
  vincularProducto,
  type SugerenciaProducto,
} from '../acciones';

// Para una línea sin match: sugerencias automáticas por similitud contra la Descripcion del
// CFDI (§Requerimientos funcionales, punto 2), más búsqueda manual y creación de producto
// nuevo. Un clic en una sugerencia resuelve la línea sin buscar a ciegas.

export function BuscadorProducto({
  lineId,
  descripcionInicial,
  categorias,
  onResuelto,
}: {
  lineId: number;
  descripcionInicial: string;
  categorias: { id: number; name: string }[];
  onResuelto: () => void;
}) {
  const [termino, setTermino] = useState(descripcionInicial);
  const [sugerencias, setSugerencias] = useState<SugerenciaProducto[]>([]);
  // Sin match directo entre `termino` y `terminoResuelto`, la búsqueda sigue en curso. Se
  // deriva así (en vez de un `setState(true)` síncrono al entrar al efecto) porque llamar
  // setState directo en el cuerpo de un efecto dispara un render en cascada innecesario.
  const [terminoResuelto, setTerminoResuelto] = useState(descripcionInicial);
  const buscando = terminoResuelto !== termino;
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  useEffect(() => {
    let vigente = true;
    const espera = setTimeout(() => {
      sugerirProductos(termino).then((resultado) => {
        if (vigente) {
          setSugerencias(resultado);
          setTerminoResuelto(termino);
        }
      });
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [termino]);

  function elegir(productId: number) {
    setError(null);
    iniciar(async () => {
      const resultado = await vincularProducto({ lineId, productId });
      if (resultado.ok) onResuelto();
      else setError(resultado.error);
    });
  }

  function crearNuevo() {
    setError(null);
    iniciar(async () => {
      const resultado = await crearProductoDesdeLinea({
        lineId,
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
        ...(code.trim() ? { code: code.trim() } : {}),
      });
      if (resultado.ok) onResuelto();
      else setError(resultado.error);
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-linea-fuerte bg-papel-hondo p-3">
      <Campo
        etiqueta="Buscar producto"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        placeholder="Buscar producto por nombre…"
      />

      {buscando && <p className="text-fino text-grafito">Buscando…</p>}

      {!buscando && sugerencias.length > 0 && (
        <ul className="flex flex-col gap-1">
          {sugerencias.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={enviando}
                onClick={() => elegir(s.id)}
                className="w-full border border-linea-fuerte bg-white px-2 py-1 text-left text-fino text-tinta hover:bg-papel-hondo disabled:opacity-50"
              >
                {s.name} {s.code && <span className="text-grafito-claro">({s.code})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!buscando && sugerencias.length === 0 && (
        <p className="text-fino text-grafito">Sin coincidencias.</p>
      )}

      {!creandoNuevo ? (
        <button
          type="button"
          onClick={() => setCreandoNuevo(true)}
          className="self-start text-fino text-boligrafo underline"
        >
          Crear producto nuevo con estos datos
        </button>
      ) : (
        <div className="flex flex-col gap-2 border-t border-linea pt-2">
          <Selector
            etiqueta="Categoría (opcional)"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            vacio="Sin categoría"
            opciones={categorias.map((c) => ({ valor: String(c.id), texto: c.name }))}
          />
          <Campo
            etiqueta="Código (opcional)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Boton type="button" tamano="normal" disabled={enviando} onClick={crearNuevo}>
            {enviando ? 'Creando…' : 'Crear y vincular'}
          </Boton>
        </div>
      )}

      {error && <Aviso tono="error">{error}</Aviso>}
    </div>
  );
}
