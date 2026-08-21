'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import {
  crearRecepcionDesdeFoto,
  crearRecepcionDesdeTexto,
  crearRecepcionManual,
  importarXmlCfdi,
} from '../acciones';
import { ModalClaveClaudeApi } from './ModalClaveClaudeApi';

type Via = 'xml' | 'manual' | 'texto' | 'foto';

const PESTANAS: [Via, string][] = [
  ['xml', 'Importar XML'],
  ['manual', 'Captura manual'],
  ['texto', 'Pegar texto'],
  ['foto', 'Subir foto'],
];

const PROMPT_SUGERIDO = `Lee la foto de este ticket y dame el listado de productos, uno por línea, en este formato exacto y nada más (sin encabezados, sin texto antes o después):

cantidad | descripción | costo unitario

Cantidad y costo con punto decimal, sin $ ni comas de miles. El costo es el precio final de cada producto. Si no puedes leer con certeza algún dato, escribe ? en ese campo en vez de inventar un valor. No incluyas totales ni impuestos.`;

function CamposProveedorYReferencia({
  proveedores,
}: {
  proveedores: { id: number; name: string }[];
}) {
  return (
    <>
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
    </>
  );
}

export function NuevaRecepcion({
  proveedores,
  claudeActiva,
  esAdmin,
}: {
  proveedores: { id: number; name: string }[];
  claudeActiva: boolean;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [via, setVia] = useState<Via>('xml');
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const formXmlRef = useRef<HTMLFormElement>(null);
  const formFotoRef = useRef<HTMLFormElement>(null);

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

  function crearDesdeTexto(datosForm: FormData) {
    setError(null);
    iniciar(async () => {
      const resultado = await crearRecepcionDesdeTexto(datosForm);
      if (resultado.ok) router.push(`/recepcion/${resultado.data.id}`);
      else setError(resultado.error);
    });
  }

  function crearDesdeFoto(datosForm: FormData) {
    setError(null);
    iniciar(async () => {
      const resultado = await crearRecepcionDesdeFoto(datosForm);
      if (resultado.ok) {
        formFotoRef.current?.reset();
        router.push(`/recepcion/${resultado.data.id}`);
      } else {
        setError(resultado.error);
      }
    });
  }

  function copiarPrompt() {
    void navigator.clipboard.writeText(PROMPT_SUGERIDO);
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap gap-2 border-b border-linea-fuerte">
        {PESTANAS.filter(([clave]) => clave !== 'foto' || claudeActiva).map(([clave, etiqueta]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setVia(clave)}
            className={`border-b-2 px-3 py-2 text-base font-medium ${
              via === clave ? 'border-boligrafo text-boligrafo' : 'border-transparent text-grafito'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {via === 'xml' && (
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
      )}

      {via === 'manual' && (
        <form action={crearManual} className="flex flex-col gap-4">
          <CamposProveedorYReferencia proveedores={proveedores} />

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando || proveedores.length === 0}>
            {enviando ? 'Creando…' : 'Crear recepción'}
          </Boton>
        </form>
      )}

      {via === 'texto' && (
        <form action={crearDesdeTexto} className="flex flex-col gap-4">
          <CamposProveedorYReferencia proveedores={proveedores} />

          <div className="border border-linea-fuerte bg-papel-hondo p-3">
            <p className="text-fino text-grafito">
              Tómale foto al ticket y pídele a Claude (en su app) que te dé el listado en este
              formato, una línea por producto:
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-fino text-tinta">
              cantidad | descripción | costo unitario
            </pre>
            <p className="mt-1 text-fino text-grafito">
              Si Claude no está seguro de un dato, debe escribir «?» en vez de inventarlo — esa
              línea se rechaza para que la corrijas.
            </p>
            <button
              type="button"
              onClick={copiarPrompt}
              className="mt-2 text-fino text-boligrafo underline underline-offset-2"
            >
              Copiar instrucciones para Claude
            </button>
            {esAdmin && (
              <div className="mt-2">
                <ModalClaveClaudeApi activa={claudeActiva} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="texto" className="text-fino font-medium text-tinta">
              Listado pegado
            </label>
            <textarea
              id="texto"
              name="texto"
              required
              rows={10}
              placeholder={
                '3 | Cuaderno profesional 100 hojas | 25.50\n1 | Caja de lápices Faber Castell 12 pzas | 45.00'
              }
              className="border border-linea-fuerte bg-white px-3 py-2 font-mono text-fino text-tinta"
            />
          </div>

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando || proveedores.length === 0}>
            {enviando ? 'Creando…' : 'Crear recepción'}
          </Boton>
        </form>
      )}

      {via === 'foto' && claudeActiva && (
        <form ref={formFotoRef} action={crearDesdeFoto} className="flex flex-col gap-4">
          <CamposProveedorYReferencia proveedores={proveedores} />

          <div className="flex flex-col gap-1">
            <label htmlFor="archivo-foto" className="text-fino font-medium text-tinta">
              Foto del ticket
            </label>
            <input
              id="archivo-foto"
              name="archivo"
              type="file"
              accept="image/*"
              required
              className="border border-linea-fuerte bg-white px-3 py-2 text-base text-tinta"
            />
            <p className="text-fino text-grafito">
              Se manda a la API de Claude para leer el listado. La imagen no se guarda.
            </p>
          </div>

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando || proveedores.length === 0}>
            {enviando ? 'Leyendo el ticket…' : 'Crear recepción'}
          </Boton>
        </form>
      )}
    </div>
  );
}
