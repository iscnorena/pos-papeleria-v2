import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { branches, users } from '@/db/schema';
import type { Sesion } from '@/lib/sesion';

// Filtros por GET: la consulta queda en la URL, así que se puede recargar, compartir y
// volver atrás. Los selectores de sucursal y cajera solo se muestran al admin, porque una
// cajera no tiene alcance para cambiarlos (el servidor lo ignora de todos modos).

export async function FiltrosFecha({
  sesion,
  valores,
  conEstado = false,
}: {
  sesion: Sesion;
  valores: { desde?: string; hasta?: string; sucursal?: string; cajera?: string; estado?: string };
  conEstado?: boolean;
}) {
  const [sucursales, cajeras] =
    sesion.rol === 'admin'
      ? await Promise.all([
          db.select().from(branches).orderBy(asc(branches.name)),
          db.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.name)),
        ])
      : [[], []];

  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <Campo etiqueta="Desde" nombre="desde" tipo="date" valor={valores.desde ?? ''} />
      <Campo etiqueta="Hasta" nombre="hasta" tipo="date" valor={valores.hasta ?? ''} />

      {sesion.rol === 'admin' && (
        <>
          <Selector
            etiqueta="Sucursal"
            nombre="sucursal"
            valor={valores.sucursal ?? ''}
            vacio="Todas"
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Cajera" nombre="cajera" valor={valores.cajera ?? ''} vacio="Todas">
            {cajeras.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Selector>
        </>
      )}

      {conEstado && (
        <Selector etiqueta="Estado" nombre="estado" valor={valores.estado ?? ''} vacio="Todos">
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
        </Selector>
      )}

      <button
        type="submit"
        className="min-h-[2.5rem] border border-boligrafo-hondo bg-boligrafo px-4 font-medium text-white shadow-impresa hover:bg-boligrafo-hondo"
      >
        Filtrar
      </button>
    </form>
  );
}

function Campo({
  etiqueta,
  nombre,
  tipo,
  valor,
}: {
  etiqueta: string;
  nombre: string;
  tipo: string;
  valor: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={nombre} className="text-fino font-medium text-tinta">
        {etiqueta}
      </label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        defaultValue={valor}
        className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
      />
    </div>
  );
}

function Selector({
  etiqueta,
  nombre,
  valor,
  vacio,
  children,
}: {
  etiqueta: string;
  nombre: string;
  valor: string;
  vacio: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={nombre} className="text-fino font-medium text-tinta">
        {etiqueta}
      </label>
      <select
        id={nombre}
        name={nombre}
        defaultValue={valor}
        className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
      >
        <option value="">{vacio}</option>
        {children}
      </select>
    </div>
  );
}
