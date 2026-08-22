'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { useIdioma } from '@/lib/i18n/cliente';
import { FORMULARIO_INICIAL, type EstadoFormulario } from '@/lib/resultado';
import { autorizarRecepcion, descartarRecepcion } from '../acciones';

// Botones de autorizar/descartar de una recepción en borrador. `esAdmin` es solo comodidad
// (esconder el botón): la Server Action vuelve a exigir el rol (§2, exigirRol('admin')).

export function AccionesRecepcion({ receiptId, esAdmin }: { receiptId: number; esAdmin: boolean }) {
  const { t } = useIdioma();
  const [estadoAutorizar, enviarAutorizar, autorizando] = useActionState<
    EstadoFormulario,
    FormData
  >(autorizarRecepcion, FORMULARIO_INICIAL);
  const [estadoDescartar, enviarDescartar, descartando] = useActionState<
    EstadoFormulario,
    FormData
  >(descartarRecepcion, FORMULARIO_INICIAL);
  const [descartando_, setDescartando] = useState(false);

  return (
    <div className="flex flex-col gap-3 border border-linea-fuerte bg-white p-4">
      {esAdmin && (
        <form action={enviarAutorizar} className="flex items-center gap-3">
          <input type="hidden" name="receiptId" value={receiptId} />
          <Boton type="submit" disabled={autorizando || descartando}>
            {autorizando ? t('recepcion.autorizando') : t('recepcion.autorizarRecepcion')}
          </Boton>
          <span className="text-fino text-grafito">{t('recepcion.sumaStockNota')}</span>
        </form>
      )}
      {estadoAutorizar.error && <Aviso tono="error">{estadoAutorizar.error}</Aviso>}

      {!descartando_ ? (
        <button
          type="button"
          onClick={() => setDescartando(true)}
          className="self-start text-fino text-sello underline"
        >
          {t('recepcion.descartarRecepcion')}
        </button>
      ) : (
        <form action={enviarDescartar} className="flex flex-col gap-2 border-t border-linea pt-3">
          <input type="hidden" name="receiptId" value={receiptId} />
          <label htmlFor="discardReason" className="text-fino font-medium text-tinta">
            {t('recepcion.motivoOpcional')}
          </label>
          <textarea
            id="discardReason"
            name="discardReason"
            rows={2}
            className="border border-linea-fuerte bg-white px-2 py-1 text-fino text-tinta"
          />
          <div className="flex items-center gap-3">
            <Boton type="submit" variante="destructiva" disabled={autorizando || descartando}>
              {descartando ? t('recepcion.descartando') : t('recepcion.confirmarDescarte')}
            </Boton>
            <button
              type="button"
              onClick={() => setDescartando(false)}
              className="text-fino text-boligrafo underline"
            >
              {t('comun.cancelar')}
            </button>
          </div>
        </form>
      )}
      {estadoDescartar.error && <Aviso tono="error">{estadoDescartar.error}</Aviso>}
    </div>
  );
}
