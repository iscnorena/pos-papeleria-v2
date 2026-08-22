import Link from 'next/link';
import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { productCategories, productSuppliers, products, suppliers } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { aCentavos, formatear } from '@/lib/money';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { guardarProducto } from './acciones';
import { ComparativoProveedores, type CostoProveedor } from './ComparativoProveedores';

export default async function PantallaProductos({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; pagina?: string; buscar?: string }>;
}) {
  const idioma = await obtenerIdioma();
  const { editar, pagina: paginaTexto, buscar: buscarTexto } = await searchParams;
  const idEditar = Number(editar);
  const pagina = paginaDeBusqueda(paginaTexto);
  const buscar = buscarTexto?.trim() ?? '';

  // Por nombre o por código: mismo criterio que ya usa el buscador de /inventario. Sin
  // esto, con el catálogo paginado no habría forma de llegar a un producto específico
  // salvo conocer su id de antemano.
  let dondeFiltra: SQL | undefined;
  if (buscar !== '') {
    const porNombreOCodigo = or(
      ilike(products.name, `%${buscar}%`),
      ilike(products.code, `%${buscar}%`),
    );
    dondeFiltra = porNombreOCodigo ? and(porNombreOCodigo) : undefined;
  }

  const [lista, filasTotal, categorias] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        code: products.code,
        costPrice: products.costPrice,
        salePrice: products.salePrice,
        managesInventory: products.managesInventory,
        openPrice: products.openPrice,
        isActive: products.isActive,
        categoria: productCategories.name,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(dondeFiltra)
      .orderBy(asc(products.name))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db.select({ total: count() }).from(products).where(dondeFiltra),
    db
      .select()
      .from(productCategories)
      .where(eq(productCategories.isActive, true))
      .orderBy(asc(productCategories.name)),
  ]);
  const total = filasTotal[0]?.total ?? 0;

  const enEdicion = Number.isInteger(idEditar)
    ? ((await db.select().from(products).where(eq(products.id, idEditar)).limit(1))[0] ?? null)
    : null;

  const costosProveedor: CostoProveedor[] = enEdicion
    ? (
        await db
          .select({
            supplierId: suppliers.id,
            supplierName: suppliers.name,
            supplierCode: productSuppliers.supplierCode,
            lastCost: productSuppliers.lastCost,
            lastCostAt: productSuppliers.lastCostAt,
            isPreferred: productSuppliers.isPreferred,
          })
          .from(productSuppliers)
          .innerJoin(suppliers, eq(productSuppliers.supplierId, suppliers.id))
          .where(eq(productSuppliers.productId, enEdicion.id))
      ).map((c) => ({ ...c, lastCost: aCentavos(c.lastCost) ?? 0 }))
    : [];

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'productos.titulo')}
        descripcion={t(idioma, 'productos.descripcion')}
      />

      {/* Filtro por GET, igual que en /inventario: queda en la URL y se puede recargar. */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="buscar" className="text-fino font-medium text-tinta">
            {t(idioma, 'comun.buscar')}
          </label>
          <input
            id="buscar"
            name="buscar"
            defaultValue={buscar}
            placeholder={t(idioma, 'admin.buscarPlaceholderNombreCodigo')}
            className="min-h-[2.5rem] w-56 border border-linea-fuerte bg-white px-3 text-base text-tinta"
          />
        </div>
        <button
          type="submit"
          className="min-h-[2.5rem] border border-boligrafo-hondo bg-boligrafo px-4 font-medium text-white shadow-impresa hover:bg-boligrafo-hondo"
        >
          {t(idioma, 'filtros.filtrar')}
        </button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <Tabla
            encabezados={[
              t(idioma, 'dashboard.colProducto'),
              t(idioma, 'dashboard.colCodigo'),
              t(idioma, 'caja.categoria'),
              t(idioma, 'admin.colCosto'),
              t(idioma, 'admin.colPrecio'),
              t(idioma, 'filtros.estado'),
              '',
            ]}
          >
            {lista.length === 0 && (
              <SinDatos columnas={7}>
                {buscar
                  ? t(idioma, 'productos.nadaCoincideBusqueda')
                  : t(idioma, 'productos.sinProductos')}
              </SinDatos>
            )}
            {lista.map((p) => {
              const costo = aCentavos(p.costPrice) ?? 0;
              const precio = aCentavos(p.salePrice) ?? 0;
              return (
                <Fila key={p.id}>
                  <Celda>
                    {p.name}
                    {!p.managesInventory && (
                      <Distintivo className="ml-2">
                        {t(idioma, 'productos.sinInventarioBadge')}
                      </Distintivo>
                    )}
                    {p.openPrice && (
                      <Distintivo className="ml-2">{t(idioma, 'caja.precioLibre')}</Distintivo>
                    )}
                  </Celda>
                  <Celda mono>{p.code ?? '—'}</Celda>
                  <Celda>{p.categoria ?? '—'}</Celda>
                  <Celda mono className="text-right">
                    {formatear(costo)}
                  </Celda>
                  <Celda mono className="text-right">
                    {formatear(precio)}
                  </Celda>
                  <Celda>
                    {p.isActive ? (
                      <Distintivo tono="visto">{t(idioma, 'comun.activo')}</Distintivo>
                    ) : (
                      <Distintivo tono="sello">{t(idioma, 'comun.inactivo')}</Distintivo>
                    )}
                  </Celda>
                  <Celda>
                    <Link href={`/productos?editar=${p.id}`} className="text-boligrafo underline">
                      {t(idioma, 'comun.editar')}
                    </Link>
                  </Celda>
                </Fila>
              );
            })}
          </Tabla>
          <Paginacion
            ruta="/productos"
            parametros={{ buscar: buscarTexto }}
            pagina={pagina}
            totalFilas={total}
            porPagina={PAGINACION.porPagina}
          />
        </div>

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion
              ? t(idioma, 'productos.editarConNombre', { nombre: enEdicion.name })
              : t(idioma, 'productos.nuevoProducto')}
          </h2>

          <FormularioCrud
            key={enEdicion?.id ?? 'nuevo'}
            accion={guardarProducto}
            textoEnviar={
              enEdicion ? t(idioma, 'admin.guardarCambios') : t(idioma, 'productos.crearProducto')
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
                nombre: 'code',
                etiqueta: t(idioma, 'dashboard.colCodigo'),
                valor: enEdicion?.code ?? '',
                ayuda: t(idioma, 'productos.codigoAyuda'),
              },
              {
                tipo: 'selector',
                nombre: 'categoryId',
                etiqueta: t(idioma, 'caja.categoria'),
                valor: enEdicion?.categoryId ? String(enEdicion.categoryId) : '',
                vacio: t(idioma, 'recepcion.sinCategoria'),
                opciones: categorias.map((c) => ({ valor: String(c.id), texto: c.name })),
              },
              {
                tipo: 'numero',
                nombre: 'costPrice',
                etiqueta: t(idioma, 'admin.colCosto'),
                valor: enEdicion?.costPrice ?? '0.00',
              },
              {
                tipo: 'numero',
                nombre: 'salePrice',
                etiqueta: t(idioma, 'productos.precioDeVenta'),
                requerido: true,
                valor: enEdicion?.salePrice ?? '0.00',
              },
              {
                tipo: 'fecha',
                nombre: 'expiryDate',
                etiqueta: t(idioma, 'productos.caducidad'),
                valor: enEdicion?.expiryDate ?? '',
              },
              {
                tipo: 'casilla',
                nombre: 'managesInventory',
                etiqueta: t(idioma, 'productos.manejaInventario'),
                valor: enEdicion?.managesInventory ?? true,
                ayuda: t(idioma, 'productos.manejaInventarioAyuda'),
              },
              {
                tipo: 'casilla',
                nombre: 'openPrice',
                etiqueta: t(idioma, 'productos.precioAbierto'),
                valor: enEdicion?.openPrice ?? false,
                ayuda: t(idioma, 'productos.precioAbiertoAyuda'),
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: t(idioma, 'comun.activo'),
                valor: enEdicion?.isActive ?? true,
                ayuda: t(idioma, 'productos.activoAyuda'),
              },
            ]}
          />

          {enEdicion && (
            <Link href="/productos" className="mt-3 block text-fino text-boligrafo underline">
              {t(idioma, 'admin.cancelarEdicion')}
            </Link>
          )}

          {enEdicion && (
            <ComparativoProveedores productId={enEdicion.id} costos={costosProveedor} />
          )}
        </aside>
      </div>
    </section>
  );
}
