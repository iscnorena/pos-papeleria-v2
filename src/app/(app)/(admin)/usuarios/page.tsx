import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { db } from '@/db';
import { branches, users } from '@/db/schema';
import { guardarUsuario } from './acciones';

export default async function PantallaUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const { editar } = await searchParams;
  const idEditar = Number(editar);

  const [lista, sucursales] = await Promise.all([
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
      .orderBy(asc(users.username)),
    db.select().from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.name)),
  ]);

  const enEdicion = Number.isInteger(idEditar)
    ? ((await db.select().from(users).where(eq(users.id, idEditar)).limit(1))[0] ?? null)
    : null;

  return (
    <section>
      <EncabezadoPantalla
        titulo="Usuarios"
        descripcion="Quién entra a la caja, con qué rol y en qué sucursal."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <Tabla encabezados={['Usuario', 'Nombre', 'Rol', 'Sucursal', 'PIN', 'Estado', '']}>
          {lista.length === 0 && <SinDatos columnas={7}>Todavía no hay usuarios.</SinDatos>}
          {lista.map((u) => (
            <Fila key={u.id}>
              <Celda mono>{u.username}</Celda>
              <Celda>{u.name}</Celda>
              <Celda>
                <Distintivo tono={u.role === 'admin' ? 'marcador' : 'neutro'}>{u.role}</Distintivo>
              </Celda>
              <Celda>{u.sucursal ?? '—'}</Celda>
              <Celda>{u.tienePin ? 'Sí' : '—'}</Celda>
              <Celda>
                {u.isActive ? (
                  <Distintivo tono="visto">Activo</Distintivo>
                ) : (
                  <Distintivo tono="sello">Inactivo</Distintivo>
                )}
              </Celda>
              <Celda>
                <Link href={`/usuarios?editar=${u.id}`} className="text-boligrafo underline">
                  Editar
                </Link>
              </Celda>
            </Fila>
          ))}
        </Tabla>

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion ? `Editar «${enEdicion.username}»` : 'Nuevo usuario'}
          </h2>

          <FormularioCrud
            key={enEdicion?.id ?? 'nuevo'}
            accion={guardarUsuario}
            textoEnviar={enEdicion ? 'Guardar cambios' : 'Crear usuario'}
            ocultos={enEdicion ? { id: String(enEdicion.id) } : {}}
            campos={[
              {
                tipo: 'texto',
                nombre: 'name',
                etiqueta: 'Nombre',
                requerido: true,
                valor: enEdicion?.name,
              },
              {
                tipo: 'texto',
                nombre: 'username',
                etiqueta: 'Usuario',
                requerido: true,
                valor: enEdicion?.username,
                ayuda: 'Corto y en minúsculas: así se teclea rápido al abrir el día.',
              },
              {
                tipo: 'selector',
                nombre: 'role',
                etiqueta: 'Rol',
                requerido: true,
                valor: enEdicion?.role ?? 'cajera',
                opciones: [
                  { valor: 'cajera', texto: 'Cajera' },
                  { valor: 'admin', texto: 'Administración' },
                ],
              },
              {
                tipo: 'selector',
                nombre: 'branchId',
                etiqueta: 'Sucursal',
                requerido: true,
                valor: enEdicion ? String(enEdicion.branchId) : '',
                vacio: 'Elige una…',
                opciones: sucursales.map((s) => ({ valor: String(s.id), texto: s.name })),
              },
              {
                tipo: 'contrasena',
                nombre: 'password',
                etiqueta: enEdicion ? 'Restablecer contraseña' : 'Contraseña',
                requerido: !enEdicion,
                ayuda: enEdicion ? 'Vacío = no cambiarla.' : 'Mínimo 6 caracteres.',
              },
              {
                tipo: 'texto',
                nombre: 'pin',
                etiqueta: enEdicion ? 'Restablecer PIN' : 'PIN',
                ayuda: enEdicion ? 'Vacío = no cambiarlo.' : '4 a 6 dígitos, único entre todos.',
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: 'Activo',
                valor: enEdicion?.isActive ?? true,
                ayuda: 'Un usuario no se borra: se desactiva y deja de poder entrar.',
              },
            ]}
          />

          {enEdicion && (
            <Link href="/usuarios" className="mt-3 block text-fino text-boligrafo underline">
              Cancelar edición
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
