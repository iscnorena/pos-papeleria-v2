import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { guardarSucursal } from './acciones';

export default async function PantallaSucursales({
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
      .from(branches)
      .orderBy(asc(branches.id))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db.select({ total: count() }).from(branches),
  ]);
  const total = filasTotal[0]?.total ?? 0;
  const enEdicion = Number.isInteger(idEditar)
    ? ((await db.select().from(branches).where(eq(branches.id, idEditar)).limit(1))[0] ?? null)
    : null;

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'sucursales.titulo')}
        descripcion={t(idioma, 'sucursales.descripcion')}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Tabla
            encabezados={[
              '#',
              t(idioma, 'admin.nombre'),
              t(idioma, 'admin.direccion'),
              t(idioma, 'admin.telefono'),
              t(idioma, 'sucursales.colWhatsapp'),
              t(idioma, 'filtros.estado'),
              '',
            ]}
          >
            {lista.length === 0 && (
              <SinDatos columnas={7}>{t(idioma, 'sucursales.sinSucursales')}</SinDatos>
            )}
            {lista.map((s) => (
              <Fila key={s.id}>
                <Celda mono>{s.id}</Celda>
                <Celda>{s.name}</Celda>
                <Celda>{s.address ?? '—'}</Celda>
                <Celda mono>{s.phone ?? '—'}</Celda>
                <Celda mono>{s.whatsappNumber ?? '—'}</Celda>
                <Celda>
                  {s.isActive ? (
                    <Distintivo tono="visto">{t(idioma, 'sucursales.activa')}</Distintivo>
                  ) : (
                    <Distintivo tono="sello">{t(idioma, 'sucursales.inactiva')}</Distintivo>
                  )}
                </Celda>
                <Celda>
                  <Link href={`/sucursales?editar=${s.id}`} className="text-boligrafo underline">
                    {t(idioma, 'comun.editar')}
                  </Link>
                </Celda>
              </Fila>
            ))}
          </Tabla>
          <Paginacion
            ruta="/sucursales"
            pagina={pagina}
            totalFilas={total}
            porPagina={PAGINACION.porPagina}
          />
        </div>

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion
              ? t(idioma, 'sucursales.editarConNombre', { nombre: enEdicion.name })
              : t(idioma, 'sucursales.nuevaSucursal')}
          </h2>

          <FormularioCrud
            // `key` fuerza a React a montar un formulario nuevo al cambiar de registro: si
            // no, los `defaultValue` del anterior se quedarían pegados.
            key={enEdicion?.id ?? 'nueva'}
            accion={guardarSucursal}
            textoEnviar={
              enEdicion ? t(idioma, 'admin.guardarCambios') : t(idioma, 'sucursales.crearSucursal')
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
                nombre: 'address',
                etiqueta: t(idioma, 'admin.direccion'),
                valor: enEdicion?.address ?? '',
              },
              {
                tipo: 'texto',
                nombre: 'phone',
                etiqueta: t(idioma, 'admin.telefono'),
                valor: enEdicion?.phone ?? '',
              },
              {
                tipo: 'texto',
                nombre: 'whatsappNumber',
                etiqueta: t(idioma, 'sucursales.whatsappEtiqueta'),
                valor: enEdicion?.whatsappNumber ?? '',
                ayuda: t(idioma, 'sucursales.whatsappAyuda'),
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: t(idioma, 'sucursales.activa'),
                valor: enEdicion?.isActive ?? true,
                ayuda: t(idioma, 'sucursales.activaAyuda'),
              },
            ]}
          />

          {enEdicion && (
            <Link href="/sucursales" className="mt-3 block text-fino text-boligrafo underline">
              {t(idioma, 'admin.cancelarEdicion')}
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
