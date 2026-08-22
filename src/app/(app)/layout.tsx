import { eq } from 'drizzle-orm';

import { salir } from '@/app/acciones-sesion';
import { EnlaceNav } from '@/components/ui/EnlaceNav';
import { SelectorIdioma } from '@/components/ui/SelectorIdioma';
import { SelectorTema } from '@/components/ui/SelectorTema';
import { POS } from '@/config/pos';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { requerirSesion } from '@/lib/sesion';

const ETIQUETA_ROL = { admin: 'nav.rolAdmin', cajera: 'nav.rolCajera' } as const;

// Todo lo que cuelga de este grupo exige sesión. El `proxy` ya redirige sin cookie, pero
// esto se vuelve a comprobar aquí: el proxy es una comprobación optimista, no la
// autorización (§2). Si alguien llegara con una cookie caducada, aquí se corta igual.
//
// La navegación esconde lo que el rol no puede usar, pero eso es comodidad, no seguridad:
// cada ruta de administración revalida el rol en el servidor (`(admin)/layout.tsx`).

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();

  const [sucursal] = await db
    .select({ name: branches.name })
    .from(branches)
    .where(eq(branches.id, sesion.branchId))
    .limit(1);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-linea-fuerte bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-display text-cuerpo font-semibold text-tinta">{POS.nombreNegocio}</p>
            <p className="font-mono text-micro uppercase text-grafito-claro">
              {sucursal?.name ?? t(idioma, 'nav.sinSucursal')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-fino text-grafito">
              <span className="text-tinta">{sesion.nombre}</span>
              <span className="ml-2 border border-linea-fuerte px-1.5 py-0.5 font-mono text-micro uppercase text-grafito">
                {t(idioma, ETIQUETA_ROL[sesion.rol])}
              </span>
            </p>
            <SelectorIdioma />
            <SelectorTema />
            <form action={salir}>
              <button
                type="submit"
                className="border border-linea-fuerte bg-white px-3 py-1.5 text-fino font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
              >
                {t(idioma, 'nav.salir')}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
        <nav aria-label={t(idioma, 'nav.secciones')} className="w-44 shrink-0">
          <p className="mb-2 font-mono text-micro uppercase text-grafito-claro">
            {t(idioma, 'nav.operacion')}
          </p>
          <EnlaceNav href="/dashboard">{t(idioma, 'nav.tablero')}</EnlaceNav>
          <EnlaceNav href="/caja">{t(idioma, 'nav.caja')}</EnlaceNav>
          <EnlaceNav href="/turnos">{t(idioma, 'nav.turnos')}</EnlaceNav>
          <EnlaceNav href="/historial">{t(idioma, 'nav.historial')}</EnlaceNav>
          <EnlaceNav href="/recepcion">{t(idioma, 'nav.recepcion')}</EnlaceNav>
          <EnlaceNav href="/herramientas">{t(idioma, 'nav.herramientas')}</EnlaceNav>

          {sesion.rol === 'admin' && (
            <>
              <p className="mb-2 mt-6 font-mono text-micro uppercase text-grafito-claro">
                {t(idioma, 'nav.administracion')}
              </p>
              <EnlaceNav href="/productos">{t(idioma, 'nav.productos')}</EnlaceNav>
              <EnlaceNav href="/categorias">{t(idioma, 'nav.categorias')}</EnlaceNav>
              <EnlaceNav href="/proveedores">{t(idioma, 'nav.proveedores')}</EnlaceNav>
              <EnlaceNav href="/inventario">{t(idioma, 'nav.inventario')}</EnlaceNav>
              <EnlaceNav href="/usuarios">{t(idioma, 'nav.usuarios')}</EnlaceNav>
              <EnlaceNav href="/sucursales">{t(idioma, 'nav.sucursales')}</EnlaceNav>
              <EnlaceNav href="/reportes">{t(idioma, 'nav.reportes')}</EnlaceNav>
            </>
          )}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
