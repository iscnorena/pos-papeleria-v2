'use client';

import { useActionState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector, type OpcionSelector } from '@/components/ui/Selector';
import { useIdioma } from '@/lib/i18n/cliente';
import { FORMULARIO_INICIAL, type EstadoFormulario } from '@/lib/resultado';

// Los cuatro CRUD de la Fase 2 (sucursales, categorías, usuarios, productos) tienen el
// mismo formulario con distintos campos. Se describe la lista de campos y este componente
// pinta, envía y coloca cada error junto al campo que falló.

export type CampoCrud =
  | {
      tipo: 'texto' | 'numero' | 'fecha' | 'contrasena';
      nombre: string;
      etiqueta: string;
      requerido?: boolean;
      ayuda?: string;
      valor?: string | undefined;
      autoFocus?: boolean;
    }
  | {
      tipo: 'selector';
      nombre: string;
      etiqueta: string;
      opciones: OpcionSelector[];
      vacio?: string;
      valor?: string | undefined;
      requerido?: boolean;
    }
  | { tipo: 'casilla'; nombre: string; etiqueta: string; valor?: boolean; ayuda?: string };

const TIPO_HTML: Record<string, string> = {
  texto: 'text',
  numero: 'text', // `text` con inputmode decimal: el spinner de `number` estorba en caja
  fecha: 'date',
  contrasena: 'password',
};

export function FormularioCrud({
  accion,
  campos,
  textoEnviar,
  ocultos = {},
  onListo,
}: {
  accion: (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;
  campos: CampoCrud[];
  textoEnviar: string;
  ocultos?: Record<string, string>;
  onListo?: () => void;
}) {
  const { t } = useIdioma();
  const [estado, enviar, enviando] = useActionState(
    async (previo: EstadoFormulario, datos: FormData) => {
      const resultado = await accion(previo, datos);
      if (resultado.ok) onListo?.();
      return resultado;
    },
    FORMULARIO_INICIAL,
  );

  return (
    <form action={enviar} className="flex flex-col gap-4">
      {Object.entries(ocultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}

      {campos.map((campo) => {
        const error = estado.errores?.[campo.nombre];

        if (campo.tipo === 'selector') {
          return (
            <Selector
              key={campo.nombre}
              etiqueta={campo.etiqueta}
              name={campo.nombre}
              opciones={campo.opciones}
              defaultValue={campo.valor ?? ''}
              {...(campo.vacio !== undefined ? { vacio: campo.vacio } : {})}
              required={campo.requerido ?? false}
              error={error}
            />
          );
        }

        if (campo.tipo === 'casilla') {
          return (
            <label key={campo.nombre} className="flex items-start gap-2 text-base text-tinta">
              <input
                type="checkbox"
                name={campo.nombre}
                defaultChecked={campo.valor ?? false}
                className="mt-0.5 border-linea-fuerte text-boligrafo"
              />
              <span>
                {campo.etiqueta}
                {campo.ayuda && <span className="block text-fino text-grafito">{campo.ayuda}</span>}
              </span>
            </label>
          );
        }

        return (
          <Campo
            key={campo.nombre}
            etiqueta={campo.etiqueta}
            name={campo.nombre}
            type={TIPO_HTML[campo.tipo]}
            defaultValue={campo.valor ?? ''}
            required={campo.requerido ?? false}
            autoFocus={campo.autoFocus ?? false}
            error={error}
            {...(campo.ayuda ? { ayuda: campo.ayuda } : {})}
            // §2 Accesibilidad: los campos numéricos con teclado decimal.
            {...(campo.tipo === 'numero' ? { inputMode: 'decimal' as const } : {})}
          />
        );
      })}

      {estado.error && <Aviso tono="error">{estado.error}</Aviso>}
      {estado.ok && estado.mensaje && <Aviso tono="exito">{estado.mensaje}</Aviso>}

      <Boton type="submit" disabled={enviando}>
        {enviando ? t('comun.guardando') : textoEnviar}
      </Boton>
    </form>
  );
}
