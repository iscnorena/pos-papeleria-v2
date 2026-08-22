'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { useIdioma } from '@/lib/i18n/cliente';
import { desactivarIntegracionClaude, guardarClaveApiClaude } from '../acciones';

// Activación admin-only de la vía "Subir foto": mientras no haya llave guardada en
// `claude_integration`, esa pestaña no existe (ver NuevaRecepcion). Nunca se pre-rellena
// el input con la llave real — las acciones de lectura no la exponen, solo si está
// configurada o no.

export function ModalClaveClaudeApi({ activa }: { activa: boolean }) {
  const { t } = useIdioma();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function cerrar() {
    setAbierto(false);
    setApiKey('');
    setError(null);
  }

  function guardar() {
    setError(null);
    iniciar(async () => {
      const datos = new FormData();
      datos.set('apiKey', apiKey);
      const resultado = await guardarClaveApiClaude(datos);
      if (resultado.ok) {
        cerrar();
        router.refresh();
      } else {
        setError(resultado.error);
      }
    });
  }

  function desactivar() {
    setError(null);
    iniciar(async () => {
      const resultado = await desactivarIntegracionClaude();
      if (resultado.ok) {
        cerrar();
        router.refresh();
      } else {
        setError(resultado.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-fino text-boligrafo underline underline-offset-2"
      >
        {activa ? t('recepcion.cargaPorFotoActivaConfigurar') : t('recepcion.subesFotosSeguido')}
      </button>

      <Modal abierto={abierto} onCerrar={cerrar} titulo={t('recepcion.integracionClaudeTitulo')}>
        <div className="flex flex-col gap-4">
          <p className="text-fino text-grafito">{t('recepcion.guardaClaveDesc')}</p>

          <div className="flex flex-col gap-1">
            <label htmlFor="clave-claude-api" className="text-fino font-medium text-tinta">
              {activa ? t('recepcion.nuevaClaveApi') : t('recepcion.claveApi')}
            </label>
            <input
              id="clave-claude-api"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
            />
          </div>

          {error && <Aviso tono="error">{error}</Aviso>}

          <div className="flex gap-2">
            <Boton onClick={guardar} disabled={enviando || apiKey.trim() === ''} className="flex-1">
              {enviando ? t('comun.guardando') : t('comun.guardar')}
            </Boton>
            {activa && (
              <Boton variante="secundaria" onClick={desactivar} disabled={enviando}>
                {t('recepcion.desactivar')}
              </Boton>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
