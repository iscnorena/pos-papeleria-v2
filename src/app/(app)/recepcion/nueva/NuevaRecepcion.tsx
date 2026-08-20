'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { crearRecepcionManual, importarXmlCfdi } from '../acciones';

type Via = 'xml' | 'manual';

export function NuevaRecepcion({ proveedores }: { proveedores: { id: number; name: string }[] }) {
  const router = useRouter();
  const [via, setVia] = useState<Via>('xml');
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const formXmlRef = useRef<HTMLFormElement>(null);

  function subirXml(datosForm: FormData) {
    setError(null);
    iniciar(async () => {
      const resultado = await importarXmlCfdi(datosForm);
      if (resultado.ok) {
        formXmlRef.current?.reset();
        router.push(`/recepcion/${resultado.data.id}`);
      } else {
        setError(resultado.error);
      }
    });
  }

  function crearManual(datosForm: FormData) {
    setError(null);
    iniciar(async () => {
      const resultado = await crearRecepcionManual(datosForm);
      if (resultado.ok) router.push(`/recepcion/${resultado.data.id}`);
      else setError(resultado.error);
    });
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex gap-2 border-b border-linea-fuerte">
        <button
          type="button"
          onClick={() => setVia('xml')}
          className={`border-b-2 px-3 py-2 text-base font-medium ${
            via === 'xml' ? 'border-boligrafo text-boligrafo' : 'border-transparent text-grafito'
          }`}
        >
          Importar XML
        </button>
        <button
          type="button"
          onClick={() => setVia('manual')}
          className={`border-b-2 px-3 py-2 text-base font-medium ${
            via === 'manual' ? 'border-boligrafo text-boligrafo' : 'border-transparent text-grafito'
          }`}
        >
          Captura manual
        </button>
      </div>

      {via === 'xml' ? (
        <form ref={formXmlRef} action={subirXml} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="archivo" className="text-fino font-medium text-tinta">
              Archivo XML (CFDI 4.0)
            </label>
            <input
              id="archivo"
              name="archivo"
              type="file"
              accept=".xml,text/xml,application/xml"
              required
              className="border border-linea-fuerte bg-white px-3 py-2 text-base text-tinta"
            />
            <p className="text-fino text-grafito">
              Se lee para extraer proveedor, folio, líneas y totales. El archivo no se guarda.
            </p>
          </div>

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Importando…' : 'Importar XML'}
          </Boton>
        </form>
      ) : (
        <form action={crearManual} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="supplierId" className="text-fino font-medium text-tinta">
              Proveedor
            </label>
            <select
              id="supplierId"
              name="supplierId"
              required
              className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
            >
              <option value="">Elige un proveedor…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {proveedores.length === 0 && (
              <p className="text-fino text-grafito">
                No hay proveedores activos todavía — créalos en Administración → Proveedores.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="referenceNote" className="text-fino font-medium text-tinta">
              Referencia (opcional)
            </label>
            <input
              id="referenceNote"
              name="referenceNote"
              className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
              placeholder="Folio interno, nota de remisión, etc."
            />
          </div>

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando || proveedores.length === 0}>
            {enviando ? 'Creando…' : 'Crear recepción'}
          </Boton>
        </form>
      )}
    </div>
  );
}
