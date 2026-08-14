'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { FORMULARIO_INICIAL, type EstadoFormulario } from '@/lib/resultado';
import { cancelarVenta } from '../acciones';

// Cancelar devuelve existencias y saca la venta de los reportes: va con confirmación,
// igual que el cierre de turno.

export function BotonCancelar({ saleId, folio }: { saleId: number; folio: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    cancelarVenta,
    FORMULARIO_INICIAL,
  );
  const [confirmando, setConfirmando] = useState(false);

  return (
    <>
      <Boton variante="destructiva" onClick={() => setConfirmando(true)}>
        Cancelar venta
      </Boton>

      <Modal
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
        titulo={`¿Cancelar la venta ${folio}?`}
      >
        <p className="text-base text-tinta">
          Las existencias vuelven al inventario y la venta deja de contar en los reportes. No se
          borra: queda en el historial, tachada.
        </p>

        {estado.error && (
          <div className="mt-3">
            <Aviso tono="error">{estado.error}</Aviso>
          </div>
        )}

        <form action={enviar} className="mt-5 flex gap-2">
          <input type="hidden" name="saleId" value={saleId} />
          <Boton type="submit" variante="destructiva" disabled={enviando}>
            {enviando ? 'Cancelando…' : 'Sí, cancelar'}
          </Boton>
          <Boton variante="secundaria" onClick={() => setConfirmando(false)} disabled={enviando}>
            Volver
          </Boton>
        </form>
      </Modal>
    </>
  );
}
