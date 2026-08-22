'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { useIdioma } from '@/lib/i18n/cliente';
import type { ClaveI18n } from '@/lib/i18n/nucleo';
import {
  crearRecepcionDesdeFoto,
  crearRecepcionDesdeTexto,
  crearRecepcionManual,
  importarXmlCfdi,
} from '../acciones';
import { ModalClaveClaudeApi } from './ModalClaveClaudeApi';

type Via = 'xml' | 'manual' | 'texto' | 'foto';

const PESTANAS: [Via, ClaveI18n][] = [
  ['xml', 'recepcion.pestanaImportarXml'],
  ['manual', 'recepcion.pestanaCapturaManual'],
  ['texto', 'recepcion.pestanaPegarTexto'],
  ['foto', 'recepcion.pestanaSubirFoto'],
];

function CamposProveedorYReferencia({
  proveedores,
}: {
  proveedores: { id: number; name: string }[];
}) {
  const { t } = useIdioma();
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="supplierId" className="text-fino font-medium text-tinta">
          {t('recepcion.proveedor')}
        </label>
        <select
          id="supplierId"
          name="supplierId"
          required
          className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
        >
          <option value="">{t('recepcion.elegeProveedor')}</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {proveedores.length === 0 && (
          <p className="text-fino text-grafito">{t('recepcion.sinProveedoresActivos')}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="referenceNote" className="text-fino font-medium text-tinta">
          {t('recepcion.referenciaOpcional')}
        </label>
        <input
          id="referenceNote"
          name="referenceNote"
          className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          placeholder={t('recepcion.referenciaPlaceholder')}
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
  const { t } = useIdioma();
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
    void navigator.clipboard.writeText(t('recepcion.promptSugerido'));
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
            {t(etiqueta)}
          </button>
        ))}
      </div>

      {via === 'xml' && (
        <form ref={formXmlRef} action={subirXml} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="archivo" className="text-fino font-medium text-tinta">
              {t('recepcion.archivoXmlCfdi')}
            </label>
            <input
              id="archivo"
              name="archivo"
              type="file"
              accept=".xml,text/xml,application/xml"
              required
              className="border border-linea-fuerte bg-white px-3 py-2 text-base text-tinta"
            />
            <p className="text-fino text-grafito">{t('recepcion.xmlSeLee')}</p>
          </div>

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando}>
            {enviando ? t('recepcion.importando') : t('recepcion.pestanaImportarXml')}
          </Boton>
        </form>
      )}

      {via === 'manual' && (
        <form action={crearManual} className="flex flex-col gap-4">
          <CamposProveedorYReferencia proveedores={proveedores} />

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando || proveedores.length === 0}>
            {enviando ? t('recepcion.creando') : t('recepcion.crearRecepcion')}
          </Boton>
        </form>
      )}

      {via === 'texto' && (
        <form action={crearDesdeTexto} className="flex flex-col gap-4">
          <CamposProveedorYReferencia proveedores={proveedores} />

          <div className="border border-linea-fuerte bg-papel-hondo p-3">
            <p className="text-fino text-grafito">{t('recepcion.tomaFotoPide')}</p>
            <pre className="mt-2 whitespace-pre-wrap text-fino text-tinta">
              {t('recepcion.formatoLinea')}
            </pre>
            <p className="mt-1 text-fino text-grafito">{t('recepcion.siClaudeNoEstaSeguro')}</p>
            <button
              type="button"
              onClick={copiarPrompt}
              className="mt-2 text-fino text-boligrafo underline underline-offset-2"
            >
              {t('recepcion.copiarInstrucciones')}
            </button>
            {esAdmin && (
              <div className="mt-2">
                <ModalClaveClaudeApi activa={claudeActiva} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="texto" className="text-fino font-medium text-tinta">
              {t('recepcion.listadoPegado')}
            </label>
            <textarea
              id="texto"
              name="texto"
              required
              rows={10}
              placeholder={t('recepcion.textoPlaceholderEjemplo')}
              className="border border-linea-fuerte bg-white px-3 py-2 font-mono text-fino text-tinta"
            />
          </div>

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando || proveedores.length === 0}>
            {enviando ? t('recepcion.creando') : t('recepcion.crearRecepcion')}
          </Boton>
        </form>
      )}

      {via === 'foto' && claudeActiva && (
        <form ref={formFotoRef} action={crearDesdeFoto} className="flex flex-col gap-4">
          <CamposProveedorYReferencia proveedores={proveedores} />

          <div className="flex flex-col gap-1">
            <label htmlFor="archivo-foto" className="text-fino font-medium text-tinta">
              {t('recepcion.fotoDelTicket')}
            </label>
            <input
              id="archivo-foto"
              name="archivo"
              type="file"
              accept="image/*"
              required
              className="border border-linea-fuerte bg-white px-3 py-2 text-base text-tinta"
            />
            <p className="text-fino text-grafito">{t('recepcion.fotoSeManda')}</p>
          </div>

          {error && <Aviso tono="error">{error}</Aviso>}

          <Boton type="submit" disabled={enviando || proveedores.length === 0}>
            {enviando ? t('recepcion.leyendoTicket') : t('recepcion.crearRecepcion')}
          </Boton>
        </form>
      )}
    </div>
  );
}
