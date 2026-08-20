import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { branches, inventories, productCategories, products } from '@/db/schema';
import { aCentavos, formatearCantidad } from '@/lib/money';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { AjusteExistencia } from './AjusteExistencia';

type Filtros = { sucursal?: string; categoria?: string; buscar?: string; pagina?: string };

export default async function PantallaInventario({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const filtros = await searchParams;
  const sucursalId = Number(filtros.sucursal);
  const categoriaId = Number(filtros.categoria);
  const buscar = filtros.buscar?.trim() ?? '';
  const pagina = paginaDeBusqueda(filtros.pagina);

  const [sucursales, categorias] = await Promise.all([
    db.select().from(branches).orderBy(asc(branches.name)),
    db.select().from(productCategories).orderBy(asc(productCategories.name)),
  ]);

  const condiciones: SQL[] = [];
  if (Number.isInteger(sucursalId) && sucursalId > 0) {
    condiciones.push(eq(inventories.branchId, sucursalId));
  }
  if (Number.isInteger(categoriaId) && categoriaId > 0) {
    condiciones.push(eq(products.categoryId, categoriaId));
  }
  if (buscar !== '') {
    // Por nombre o por código: en el mostrador se busca de las dos formas.
    const porNombreOCodigo = or(
      ilike(products.name, `%${buscar}%`),
      ilike(products.code, `%${buscar}%`),
    );
    if (porNombreOCodigo) condiciones.push(porNombreOCodigo);
  }

  const dondeFiltra = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [lista, filasTotal] = await Promise.all([
    db
      .select({
        productId: products.id,
        producto: products.name,
        code: products.code,
        categoria: productCategories.name,
        branchId: branches.id,
        sucursal: branches.name,
        stock: inventories.stock,
        activo: products.isActive,
      })
      .from(inventories)
      .innerJoin(products, eq(inventories.productId, products.id))
      .innerJoin(branches, eq(inventories.branchId, branches.id))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(dondeFiltra)
      .orderBy(asc(products.name), asc(branches.id))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db
      .select({ total: count() })
      .from(inventories)
      .innerJoin(products, eq(inventories.productId, products.id))
      .innerJoin(branches, eq(inventories.branchId, branches.id))
      .where(dondeFiltra),
  ]);
  const total = filasTotal[0]?.total ?? 0;

  return (
    <section>
      <EncabezadoPantalla
        titulo="Inventario"
        descripcion="Existencias por sucursal. Ajustar aquí fija la cantidad contada, no la suma."
      />

      {/* Filtros por GET: la búsqueda queda en la URL y se puede compartir o recargar. */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="buscar" className="text-fino font-medium text-tinta">
            Buscar
          </label>
          <input
            id="buscar"
            name="buscar"
            defaultValue={buscar}
            placeholder="Nombre o código"
            className="min-h-[2.5rem] w-56 border border-linea-fuerte bg-white px-3 text-base text-tinta"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sucursal" className="text-fino font-medium text-tinta">
            Sucursal
          </label>
          <select
            id="sucursal"
            name="sucursal"
            defaultValue={filtros.sucursal ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          >
            <option value="">Todas</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="categoria" className="text-fino font-medium text-tinta">
            Categoría
          </label>
          <select
            id="categoria"
            name="categoria"
            defaultValue={filtros.categoria ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="min-h-[2.5rem] border border-boligrafo-hondo bg-boligrafo px-4 font-medium text-white shadow-impresa hover:bg-boligrafo-hondo"
        >
          Filtrar
        </button>
      </form>

      <Tabla encabezados={['Producto', 'Código', 'Categoría', 'Sucursal', 'Existencia', 'Ajustar']}>
        {lista.length === 0 && (
          <SinDatos columnas={6}>No hay existencias que coincidan con el filtro.</SinDatos>
        )}
        {lista.map((r) => {
          const stock = aCentavos(r.stock) ?? 0;
          return (
            // §Fase 2: los renglones sin existencia se resaltan en `sello-tenue`.
            <Fila key={`${r.productId}-${r.branchId}`} resaltada={stock <= 0}>
              <Celda>
                {r.producto}
                {!r.activo && (
                  <Distintivo tono="sello" className="ml-2">
                    Inactivo
                  </Distintivo>
                )}
              </Celda>
              <Celda mono>{r.code ?? '—'}</Celda>
              <Celda>{r.categoria ?? '—'}</Celda>
              <Celda>{r.sucursal}</Celda>
              <Celda mono className="text-right">
                {formatearCantidad(stock)}
              </Celda>
              <Celda>
                <AjusteExistencia
                  productId={r.productId}
                  branchId={r.branchId}
                  stock={formatearCantidad(stock)}
                />
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
      <Paginacion
        ruta="/inventario"
        parametros={filtros}
        pagina={pagina}
        totalFilas={total}
        porPagina={PAGINACION.porPagina}
      />
    </section>
  );
}
