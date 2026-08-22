import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { guardarProveedor } from './acciones';

export default async function PantallaProveedores({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; pagina?: string }>;
}) {
  const idioma = await obtenerIdioma();
  const { editar, pagina: paginaTexto } = await searchParams;
  const idEditar = Number(editar);
  const pagina = paginaDeBusqueda(paginaTexto);

  const [lista, filasTotal] = await Promise.all([
    db
      .select()
      .from(suppliers)
      .orderBy(asc(suppliers.name))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db.select({ total: count() }).from(suppliers),
  ]);
  const total = filasTotal[0]?.total ?? 0;
  const enEdicion = Number.isInteger(idEditar)
    ? ((await db.select().from(suppliers).where(eq(suppliers.id, idEditar)).limit(1))[0] ?? null)
    : null;

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'proveedores.titulo')}
        descripcion={t(idioma, 'proveedores.descripcion')}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Tabla
            encabezados={[
              '#',
              t(idioma, 'admin.nombre'),
              'RFC',
              t(idioma, 'admin.contacto'),
              t(idioma, 'admin.telefono'),
              t(idioma, 'filtros.estado'),
              '',
            ]}
          >
            {lista.length === 0 && (
              <SinDatos columnas={7}>{t(idioma, 'proveedores.sinProveedores')}</SinDatos>
            )}
            {lista.map((s) => (
              <Fila key={s.id}>
                <Celda mono>{s.id}</Celda>
                <Celda>{s.name}</Celda>
                <Celda mono>{s.rfc ?? '—'}</Celda>
                <Celda>{s.contactName ?? '—'}</Celda>
                <Celda mono>{s.phone ?? '—'}</Celda>
                <Celda>
                  {s.isActive ? (
                    <Distintivo tono="visto">{t(idioma, 'comun.activo')}</Distintivo>
                  ) : (
                    <Distintivo tono="sello">{t(idioma, 'comun.inactivo')}</Distintivo>
                  )}
                </Celda>
                <Celda>
                  <Link href={`/proveedores?editar=${s.id}`} className="text-boligrafo underline">
                    {t(idioma, 'comun.editar')}
                  </Link>
                </Celda>
              </Fila>
            ))}
          </Tabla>
          <Paginacion
            ruta="/proveedores"
            pagina={pagina}
            totalFilas={total}
            porPagina={PAGINACION.porPagina}
          />
        </div>

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion
              ? t(idioma, 'proveedores.editarConNombre', { nombre: enEdicion.name })
              : t(idioma, 'proveedores.nuevoProveedor')}
          </h2>

          <FormularioCrud
            key={enEdicion?.id ?? 'nuevo'}
            accion={guardarProveedor}
            textoEnviar={
              enEdicion
                ? t(idioma, 'admin.guardarCambios')
                : t(idioma, 'proveedores.crearProveedor')
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
                nombre: 'rfc',
                etiqueta: 'RFC',
                valor: enEdicion?.rfc ?? '',
                ayuda: t(idioma, 'proveedores.rfcAyuda'),
              },
              {
                tipo: 'texto',
                nombre: 'contactName',
                etiqueta: t(idioma, 'admin.contacto'),
                valor: enEdicion?.contactName ?? '',
              },
              {
                tipo: 'texto',
                nombre: 'phone',
                etiqueta: t(idioma, 'admin.telefono'),
                valor: enEdicion?.phone ?? '',
              },
              {
                tipo: 'texto',
                nombre: 'email',
                etiqueta: t(idioma, 'admin.correo'),
                valor: enEdicion?.email ?? '',
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: t(idioma, 'comun.activo'),
                valor: enEdicion?.isActive ?? true,
                ayuda: t(idioma, 'proveedores.activoAyuda'),
              },
            ]}
          />

          {enEdicion && (
            <Link href="/proveedores" className="mt-3 block text-fino text-boligrafo underline">
              {t(idioma, 'admin.cancelarEdicion')}
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
