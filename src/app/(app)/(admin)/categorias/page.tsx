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
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { guardarCategoria } from './acciones';

export default async function PantallaCategorias({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; pagina?: string }>;
}) {
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
        titulo="Categorías"
        descripcion="Agrupan el catálogo para buscar rápido en la caja."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <Tabla encabezados={['Nombre', 'Descripción', 'Productos', 'Estado', '']}>
          {lista.length === 0 && <SinDatos columnas={5}>Todavía no hay categorías.</SinDatos>}
          {lista.map((c) => (
            <Fila key={c.id}>
              <Celda>{c.name}</Celda>
              <Celda>{c.description ?? '—'}</Celda>
              <Celda mono>{c.productos}</Celda>
              <Celda>
                {c.isActive ? (
                  <Distintivo tono="visto">Activa</Distintivo>
                ) : (
                  <Distintivo tono="sello">Inactiva</Distintivo>
                )}
              </Celda>
              <Celda>
                <Link href={`/categorias?editar=${c.id}`} className="text-boligrafo underline">
                  Editar
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

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion ? `Editar «${enEdicion.name}»` : 'Nueva categoría'}
          </h2>

          <FormularioCrud
            key={enEdicion?.id ?? 'nueva'}
            accion={guardarCategoria}
            textoEnviar={enEdicion ? 'Guardar cambios' : 'Crear categoría'}
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
                nombre: 'description',
                etiqueta: 'Descripción',
                valor: enEdicion?.description ?? '',
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: 'Activa',
                valor: enEdicion?.isActive ?? true,
              },
            ]}
          />

          {enEdicion && (
            <Link href="/categorias" className="mt-3 block text-fino text-boligrafo underline">
              Cancelar edición
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
