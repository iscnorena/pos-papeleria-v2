'use client';

import { useActionState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { useIdioma } from '@/lib/i18n/cliente';
import { FORMULARIO_INICIAL, type EstadoFormulario } from '@/lib/resultado';
import { abrirTurno } from '../acciones';

export function FormularioApertura() {
  const { t } = useIdioma();
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    abrirTurno,
    FORMULARIO_INICIAL,
  );

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Campo
        etiqueta={t('turnos.fondoDeCaja')}
        name="openingAmount"
        defaultValue="0.00"
        inputMode="decimal"
        autoFocus
        ayuda={t('turnos.fondoDeCajaAyuda')}
        error={estado.errores?.openingAmount}
      />
      {estado.error && <Aviso tono="error">{estado.error}</Aviso>}
      <Boton type="submit" disabled={enviando}>
        {enviando ? t('turnos.abriendo') : t('turnos.abrirTurno')}
      </Boton>
    </form>
  );
}
