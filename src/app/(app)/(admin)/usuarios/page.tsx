import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { branches, users } from '@/db/schema';
import { obtenerIdioma, t, type ClaveI18n } from '@/lib/i18n/servidor';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { guardarUsuario } from './acciones';

const ETIQUETA_ROL: Record<'admin' | 'cajera', ClaveI18n> = {
  admin: 'nav.rolAdmin',
  cajera: 'nav.rolCajera',
};

export default async function PantallaUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; pagina?: string }>;
}) {
  const idioma = await obtenerIdioma();
  const { editar, pagina: paginaTexto } = await searchParams;
  const idEditar = Number(editar);
  const pagina = paginaDeBusqueda(paginaTexto);

  const [lista, filasTotal, sucursales] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        sucursal: branches.name,
        tienePin: users.pinHash,
      })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .orderBy(asc(users.username))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db.select({ total: count() }).from(users),
    db.select().from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.name)),
  ]);
  const total = filasTotal[0]?.total ?? 0;

  const enEdicion = Number.isInteger(idEditar)
    ? ((await db.select().from(users).where(eq(users.id, idEditar)).limit(1))[0] ?? null)
    : null;

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'usuarios.titulo')}
        descripcion={t(idioma, 'usuarios.descripcion')}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <Tabla
            encabezados={[
              t(idioma, 'usuarios.colUsuario'),
              t(idioma, 'admin.nombre'),
              t(idioma, 'admin.rol'),
              t(idioma, 'filtros.sucursal'),
              t(idioma, 'usuarios.colPin'),
              t(idioma, 'filtros.estado'),
              '',
            ]}
          >
            {lista.length === 0 && (
              <SinDatos columnas={7}>{t(idioma, 'usuarios.sinUsuarios')}</SinDatos>
            )}
            {lista.map((u) => (
              <Fila key={u.id}>
                <Celda mono>{u.username}</Celda>
                <Celda>{u.name}</Celda>
                <Celda>
                  <Distintivo tono={u.role === 'admin' ? 'marcador' : 'neutro'}>
                    {t(idioma, ETIQUETA_ROL[u.role])}
                  </Distintivo>
                </Celda>
                <Celda>{u.sucursal ?? '—'}</Celda>
                <Celda>{u.tienePin ? t(idioma, 'comun.si') : '—'}</Celda>
                <Celda>
                  {u.isActive ? (
                    <Distintivo tono="visto">{t(idioma, 'comun.activo')}</Distintivo>
                  ) : (
                    <Distintivo tono="sello">{t(idioma, 'comun.inactivo')}</Distintivo>
                  )}
                </Celda>
                <Celda>
                  <Link href={`/usuarios?editar=${u.id}`} className="text-boligrafo underline">
                    {t(idioma, 'comun.editar')}
                  </Link>
                </Celda>
              </Fila>
            ))}
          </Tabla>
          <Paginacion
            ruta="/usuarios"
            pagina={pagina}
            totalFilas={total}
            porPagina={PAGINACION.porPagina}
          />
        </div>

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion
              ? t(idioma, 'usuarios.editarConUsername', { username: enEdicion.username })
              : t(idioma, 'usuarios.nuevoUsuario')}
          </h2>

          <FormularioCrud
            key={enEdicion?.id ?? 'nuevo'}
            accion={guardarUsuario}
            textoEnviar={
              enEdicion ? t(idioma, 'admin.guardarCambios') : t(idioma, 'usuarios.crearUsuario')
            }
            ocultos={enEdicion ? { id: String(enEdicion.id) } : {}}
            campos={[
              {
                tipo: 'texto',
                nombre: 'name',
                etiqueta: t(idioma, 'admin.nombre'),
                requerido: true,
                valor: enEdicion?.name,
              },
              {
                tipo: 'texto',
                nombre: 'username',
                etiqueta: t(idioma, 'usuarios.colUsuario'),
                requerido: true,
                valor: enEdicion?.username,
                ayuda: t(idioma, 'usuarios.usuarioAyuda'),
              },
              {
                tipo: 'selector',
                nombre: 'role',
                etiqueta: t(idioma, 'admin.rol'),
                requerido: true,
                valor: enEdicion?.role ?? 'cajera',
                opciones: [
                  { valor: 'cajera', texto: t(idioma, 'usuarios.opcionCajera') },
                  { valor: 'admin', texto: t(idioma, 'nav.administracion') },
                ],
              },
              {
                tipo: 'selector',
                nombre: 'branchId',
                etiqueta: t(idioma, 'filtros.sucursal'),
                requerido: true,
                valor: enEdicion ? String(enEdicion.branchId) : '',
                vacio: t(idioma, 'admin.eligeUna'),
                opciones: sucursales.map((s) => ({ valor: String(s.id), texto: s.name })),
              },
              {
                tipo: 'contrasena',
                nombre: 'password',
                etiqueta: enEdicion
                  ? t(idioma, 'usuarios.restablecerContrasena')
                  : t(idioma, 'login.campoContrasena'),
                requerido: !enEdicion,
                ayuda: enEdicion
                  ? t(idioma, 'usuarios.contrasenaAyudaEditar')
                  : t(idioma, 'usuarios.contrasenaAyudaNueva'),
              },
              {
                tipo: 'texto',
                nombre: 'pin',
                etiqueta: enEdicion
                  ? t(idioma, 'usuarios.restablecerPin')
                  : t(idioma, 'login.pestanaPin'),
                ayuda: enEdicion
                  ? t(idioma, 'usuarios.pinAyudaEditar')
                  : t(idioma, 'usuarios.pinAyudaNueva'),
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: t(idioma, 'comun.activo'),
                valor: enEdicion?.isActive ?? true,
                ayuda: t(idioma, 'usuarios.activoAyuda'),
              },
            ]}
          />

          {enEdicion && (
            <Link href="/usuarios" className="mt-3 block text-fino text-boligrafo underline">
              {t(idioma, 'admin.cancelarEdicion')}
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
