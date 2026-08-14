import { eq } from 'drizzle-orm';

import { salir } from '@/app/acciones-sesion';
import { POS } from '@/config/pos';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { requerirSesion } from '@/lib/sesion';

// Todo lo que cuelga de este grupo exige sesión. El `proxy` ya redirige sin cookie, pero
// esto se vuelve a comprobar aquí: el proxy es una comprobación optimista, no la
// autorización (§2). Si alguien llegara con una cookie caducada, aquí se corta igual.

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();

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
              {sucursal?.name ?? 'Sin sucursal'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-fino text-grafito">
              <span className="text-tinta">{sesion.nombre}</span>
              <span className="ml-2 border border-linea-fuerte px-1.5 py-0.5 font-mono text-micro uppercase text-grafito">
                {sesion.rol}
              </span>
            </p>
            <form action={salir}>
              <button
                type="submit"
                className="border border-linea-fuerte bg-white px-3 py-1.5 text-fino font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
