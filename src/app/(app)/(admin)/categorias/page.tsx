import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { productCategories, products } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { guardarCategoria } from './acciones';

export default async function PantallaCategorias({
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
      .select({
        id: productCategories.id,
        name: productCategories.name,
        description: productCategories.description,
        isActive: productCategories.isActive,
        productos: count(products.id),
      })
      .from(productCategories)
      .leftJoin(products, eq(products.categoryId, productCategories.id))
      .groupBy(productCategories.id)
      .orderBy(asc(productCategories.name))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db.select({ total: count() }).from(productCategories),
  ]);
  const total = filasTotal[0]?.total ?? 0;

  const enEdicion = Number.isInteger(idEditar)
    ? ((
        await db.select().from(productCategories).where(eq(productCategories.id, idEditar)).limit(1)
      )[0] ?? null)
    : null;

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'categorias.titulo')}
        descripcion={t(idioma, 'categorias.descripcion')}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Tabla
            encabezados={[
              t(idioma, 'admin.nombre'),
              t(idioma, 'admin.descripcion'),
              t(idioma, 'categorias.colProductos'),
              t(idioma, 'filtros.estado'),
              '',
            ]}
          >
            {lista.length === 0 && (
              <SinDatos columnas={5}>{t(idioma, 'categorias.sinCategorias')}</SinDatos>
            )}
            {lista.map((c) => (
              <Fila key={c.id}>
                <Celda>{c.name}</Celda>
                <Celda>{c.description ?? '—'}</Celda>
                <Celda mono>{c.productos}</Celda>
                <Celda>
                  {c.isActive ? (
                    <Distintivo tono="visto">{t(idioma, 'categorias.activa')}</Distintivo>
                  ) : (
                    <Distintivo tono="sello">{t(idioma, 'categorias.inactiva')}</Distintivo>
                  )}
                </Celda>
                <Celda>
                  <Link href={`/categorias?editar=${c.id}`} className="text-boligrafo underline">
                    {t(idioma, 'comun.editar')}
                  </Link>
                </Celda>
              </Fila>
            ))}
          </Tabla>
          <Paginacion
            ruta="/categorias"
            pagina={pagina}
            totalFilas={total}
            porPagina={PAGINACION.porPagina}
          />
        </div>

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion
              ? t(idioma, 'categorias.editarConNombre', { nombre: enEdicion.name })
              : t(idioma, 'categorias.nuevaCategoria')}
          </h2>

          <FormularioCrud
            key={enEdicion?.id ?? 'nueva'}
            accion={guardarCategoria}
            textoEnviar={
              enEdicion ? t(idioma, 'admin.guardarCambios') : t(idioma, 'categorias.crearCategoria')
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
                nombre: 'description',
                etiqueta: t(idioma, 'admin.descripcion'),
                valor: enEdicion?.description ?? '',
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: t(idioma, 'categorias.activa'),
                valor: enEdicion?.isActive ?? true,
              },
            ]}
          />

          {enEdicion && (
            <Link href="/categorias" className="mt-3 block text-fino text-boligrafo underline">
              {t(idioma, 'admin.cancelarEdicion')}
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
