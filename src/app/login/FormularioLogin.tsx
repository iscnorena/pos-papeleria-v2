'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { clases } from '@/lib/clases';
import { entrarConContrasena, entrarConPin, type EstadoLogin } from './acciones';

const INICIAL: EstadoLogin = {};
const PIN_MAXIMO = 6;
const PIN_MINIMO = 4;

type Pestana = 'contrasena' | 'pin';

export function FormularioLogin({ siguiente }: { siguiente: string }) {
  const [pestana, setPestana] = useState<Pestana>('contrasena');

  return (
    <div>
      {/* Las pestañas son solapas de carpeta: se pegan al borde superior de la tarjeta y la
          activa se funde con ella tapando el filete de abajo. */}
      <div role="tablist" aria-label="Cómo entrar" className="flex gap-1">
        <Solapa
          activa={pestana === 'contrasena'}
          onClick={() => setPestana('contrasena')}
          id="tab-contrasena"
          panel="panel-contrasena"
        >
          Contraseña
        </Solapa>
        <Solapa
          activa={pestana === 'pin'}
          onClick={() => setPestana('pin')}
          id="tab-pin"
          panel="panel-pin"
        >
          PIN
        </Solapa>
      </div>

      <div className="border border-linea-fuerte bg-white p-6 shadow-impresa">
        {pestana === 'contrasena' ? (
          <PanelContrasena siguiente={siguiente} />
        ) : (
          <PanelPin siguiente={siguiente} />
        )}
      </div>
    </div>
  );
}

function Solapa({
  activa,
  onClick,
  id,
  panel,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  id: string;
  panel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={activa}
      aria-controls={panel}
      onClick={onClick}
      className={clases(
        'relative -mb-px border border-b-0 px-4 py-2 text-base font-medium',
        activa
          ? 'z-10 border-linea-fuerte bg-white text-tinta'
          : 'border-linea bg-papel-hondo text-grafito hover:text-tinta',
      )}
    >
      {children}
    </button>
  );
}

function PanelContrasena({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(entrarConContrasena, INICIAL);

  return (
    <form
      action={accion}
      id="panel-contrasena"
      role="tabpanel"
      aria-labelledby="tab-contrasena"
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="siguiente" value={siguiente} />
      <Campo etiqueta="Usuario" name="usuario" autoComplete="username" autoFocus required />
      <Campo
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="current-password"
        required
      />
      {estado.error && <Aviso tono="error">{estado.error}</Aviso>}
      <Boton type="submit" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </Boton>
    </form>
  );
}

function PanelPin({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(entrarConPin, INICIAL);
  const [pin, setPin] = useState('');
  const formulario = useRef<HTMLFormElement>(null);

  const agregar = useCallback((digito: string) => {
    setPin((actual) => (actual.length >= PIN_MAXIMO ? actual : actual + digito));
  }, []);
  const borrar = useCallback(() => setPin((actual) => actual.slice(0, -1)), []);

  // El teclado físico tiene que funcionar igual que los botones: la cajera teclea el PIN
  // sin soltar el teclado al cambiar de turno (§5).
  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key >= '0' && evento.key <= '9') {
        agregar(evento.key);
      } else if (evento.key === 'Backspace') {
        evento.preventDefault();
        borrar();
      } else if (evento.key === 'Enter') {
        // El submit lo dispara el formulario, no este manejador, para que pase por la
        // misma validación que el clic en «Entrar».
        formulario.current?.requestSubmit();
      }
    }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [agregar, borrar]);

  // Tras un intento fallido el PIN se limpia solo: dejarlo escrito invita a reenviarlo igual.
  //
  // Va como ajuste durante el render y no dentro de un `useEffect`, que es el patrón que
  // React recomienda para «cambiar estado cuando cambia una entrada»: con el efecto, el
  // componente se pintaba una vez con el PIN viejo y volvía a pintarse vacío.
  const [ultimoEstado, setUltimoEstado] = useState(estado);
  if (estado !== ultimoEstado) {
    setUltimoEstado(estado);
    if (estado.error) setPin('');
  }

  const completo = pin.length >= PIN_MINIMO;

  return (
    <form
      ref={formulario}
      action={accion}
      id="panel-pin"
      role="tabpanel"
      aria-labelledby="tab-pin"
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="siguiente" value={siguiente} />
      <input type="hidden" name="pin" value={pin} />

      {/* Progreso con cuadritos, no con asteriscos (§ Fase 1). */}
      <div
        className="flex justify-center gap-2"
        aria-live="polite"
        aria-label={`${pin.length} dígitos`}
      >
        {Array.from({ length: PIN_MAXIMO }, (_, i) => (
          <span
            key={i}
            className={clases(
              'h-4 w-4 border',
              i < pin.length ? 'border-tinta bg-tinta' : 'border-linea-fuerte bg-papel-hondo',
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Boton
            key={d}
            variante="secundaria"
            tamano="tecla"
            className="font-mono text-cuerpo"
            onClick={() => agregar(d)}
          >
            {d}
          </Boton>
        ))}
        <Boton variante="secundaria" tamano="tecla" onClick={borrar} aria-label="Borrar un dígito">
          ←
        </Boton>
        <Boton
          variante="secundaria"
          tamano="tecla"
          className="font-mono text-cuerpo"
          onClick={() => agregar('0')}
        >
          0
        </Boton>
        <Boton
          type="submit"
          tamano="tecla"
          disabled={!completo || enviando}
          aria-label="Entrar con PIN"
        >
          {enviando ? '…' : 'Entrar'}
        </Boton>
      </div>

      {estado.error && <Aviso tono="error">{estado.error}</Aviso>}
    </form>
  );
}
