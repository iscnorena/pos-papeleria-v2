'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { tonoDiferencia } from '@/lib/formato';
import { aCentavos, formatear } from '@/lib/money';
import { FORMULARIO_INICIAL, type EstadoFormulario } from '@/lib/resultado';
import { cerrarTurno } from '../../acciones';

/**
 * La pantalla que más cuidado necesita (§ Fase 3): la cajera captura el efectivo contado y
 * **antes de confirmar** ve el esperado y la diferencia calculada en vivo.
 *
 * Lo que se muestra aquí es una ayuda para contar, no la fuente de verdad: el servidor
 * vuelve a calcular esperado y diferencia al cerrar. Si alguien manipulara el campo oculto,
 * el corte guardado seguiría siendo el correcto.
 */
export function FormularioCierre({
  shiftId,
  fondoDeCaja,
  efectivoDeVentas,
  efectivoEsperado,
}: {
  shiftId: number;
  fondoDeCaja: number;
  efectivoDeVentas: number;
  efectivoEsperado: number;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    cerrarTurno,
    FORMULARIO_INICIAL,
  );
  const [contadoTexto, setContadoTexto] = useState('0.00');
  const [confirmando, setConfirmando] = useState(false);

  const contado = aCentavos(contadoTexto);
  const diferencia = contado === null ? null : contado - efectivoEsperado;

  return (
    <>
      <div className="mb-6 border border-linea-fuerte bg-white p-5 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Cuentas del turno</h2>
        <dl className="divide-y divide-linea">
          <Renglon etiqueta="Fondo de caja" valor={formatear(fondoDeCaja)} />
          <Renglon etiqueta="Efectivo de las ventas" valor={formatear(efectivoDeVentas)} />
          <Renglon etiqueta="Efectivo esperado" valor={formatear(efectivoEsperado)} destacado />
        </dl>
      </div>

      <form
        action={enviar}
        className="border border-linea-fuerte bg-white p-5 shadow-impresa"
        onSubmit={(evento) => {
          // Cerrar es irreversible: primero el modal, y solo desde ahí se envía.
          if (!confirmando) {
            evento.preventDefault();
            setConfirmando(true);
          }
        }}
      >
        <input type="hidden" name="shiftId" value={shiftId} />

        <Campo
          etiqueta="Efectivo contado"
          name="actualCash"
          value={contadoTexto}
          onChange={(e) => setContadoTexto(e.target.value)}
          inputMode="decimal"
          autoFocus
          ayuda="Lo que hay de verdad en el cajón, billetes y monedas."
          error={estado.errores?.actualCash}
        />

        <div className="mt-4 flex items-baseline justify-between border-t border-linea-fuerte pt-4">
          <span className="text-cuerpo text-grafito">Diferencia</span>
          <span
            className={`tabular font-mono text-cifra ${diferencia === null ? 'text-grafito-claro' : tonoDiferencia(diferencia)}`}
            aria-live="polite"
          >
            {diferencia === null ? '—' : formatear(diferencia)}
          </span>
        </div>

        {diferencia !== null && diferencia !== 0 && (
          <p className="mt-2 text-fino text-grafito">
            {diferencia < 0
              ? `Falta ${formatear(Math.abs(diferencia))} respecto a lo esperado.`
              : `Sobra ${formatear(diferencia)} respecto a lo esperado.`}
          </p>
        )}

        <div className="mt-4">
          <Campo etiqueta="Nota (opcional)" name="notes" />
        </div>

        {estado.error && (
          <div className="mt-4">
            <Aviso tono="error">{estado.error}</Aviso>
          </div>
        )}

        <Boton type="submit" className="mt-5 w-full" disabled={enviando}>
          {enviando ? 'Cerrando…' : 'Cerrar turno'}
        </Boton>

        <Modal
          abierto={confirmando}
          onCerrar={() => setConfirmando(false)}
          titulo="¿Cerrar el turno?"
        >
          <p className="text-base text-tinta">
            Vas a cerrar con <span className="tabular font-mono">{formatear(contado ?? 0)}</span>{' '}
            contados y una diferencia de{' '}
            <span
              className={`tabular font-mono ${diferencia === null ? '' : tonoDiferencia(diferencia)}`}
            >
              {diferencia === null ? '—' : formatear(diferencia)}
            </span>
            .
          </p>
          <p className="mt-2 text-fino text-grafito">Esto no se puede deshacer.</p>

          <div className="mt-5 flex gap-2">
            <Boton type="submit" disabled={enviando}>
              Sí, cerrar
            </Boton>
            <Boton variante="secundaria" onClick={() => setConfirmando(false)}>
              Volver
            </Boton>
          </div>
        </Modal>
      </form>
    </>
  );
}

function Renglon({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <dt className={destacado ? 'text-cuerpo text-tinta' : 'text-base text-grafito'}>
        {etiqueta}
      </dt>
      <dd
        className={`tabular font-mono ${destacado ? 'text-cuerpo text-tinta' : 'text-base text-grafito'}`}
      >
        {valor}
      </dd>
    </div>
  );
}
