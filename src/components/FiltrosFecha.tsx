import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { branches, users } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
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
  const idioma = await obtenerIdioma();

  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <Campo
        etiqueta={t(idioma, 'filtros.desde')}
        nombre="desde"
        tipo="date"
        valor={valores.desde ?? ''}
      />
      <Campo
        etiqueta={t(idioma, 'filtros.hasta')}
        nombre="hasta"
        tipo="date"
        valor={valores.hasta ?? ''}
      />

      {sesion.rol === 'admin' && (
        <>
          <Selector
            etiqueta={t(idioma, 'filtros.sucursal')}
            nombre="sucursal"
            valor={valores.sucursal ?? ''}
            vacio={t(idioma, 'comun.todas')}
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Selector>
          <Selector
            etiqueta={t(idioma, 'filtros.cajera')}
            nombre="cajera"
            valor={valores.cajera ?? ''}
            vacio={t(idioma, 'comun.todas')}
          >
            {cajeras.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Selector>
        </>
      )}

      {conEstado && (
        <Selector
          etiqueta={t(idioma, 'filtros.estado')}
          nombre="estado"
          valor={valores.estado ?? ''}
          vacio={t(idioma, 'filtros.todos')}
        >
          <option value="completed">{t(idioma, 'filtros.completadas')}</option>
          <option value="cancelled">{t(idioma, 'filtros.canceladas')}</option>
        </Selector>
      )}

      <button
        type="submit"
        className="min-h-[2.5rem] border border-boligrafo-hondo bg-boligrafo px-4 font-medium text-white shadow-impresa hover:bg-boligrafo-hondo"
      >
        {t(idioma, 'filtros.filtrar')}
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
