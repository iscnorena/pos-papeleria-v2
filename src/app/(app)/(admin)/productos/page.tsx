import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { db } from '@/db';
import { productCategories, productSuppliers, products, suppliers } from '@/db/schema';
import { aCentavos, formatear } from '@/lib/money';
import { guardarProducto } from './acciones';
import { ComparativoProveedores, type CostoProveedor } from './ComparativoProveedores';

export default async function PantallaProductos({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const { editar } = await searchParams;
  const idEditar = Number(editar);

  const [lista, categorias] = await Promise.all([
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
      .orderBy(asc(products.name)),
    db
      .select()
      .from(productCategories)
      .where(eq(productCategories.isActive, true))
      .orderBy(asc(productCategories.name)),
  ]);

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
        titulo="Productos"
        descripcion="El catálogo que ve la caja. Los inactivos siguen en el historial pero no se pueden vender."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <Tabla encabezados={['Producto', 'Código', 'Categoría', 'Costo', 'Precio', 'Estado', '']}>
          {lista.length === 0 && <SinDatos columnas={7}>Todavía no hay productos.</SinDatos>}
          {lista.map((p) => {
            const costo = aCentavos(p.costPrice) ?? 0;
            const precio = aCentavos(p.salePrice) ?? 0;
            return (
              <Fila key={p.id}>
                <Celda>
                  {p.name}
                  {!p.managesInventory && <Distintivo className="ml-2">Sin inventario</Distintivo>}
                  {p.openPrice && <Distintivo className="ml-2">Precio libre</Distintivo>}
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
                    <Distintivo tono="visto">Activo</Distintivo>
                  ) : (
                    <Distintivo tono="sello">Inactivo</Distintivo>
                  )}
                </Celda>
                <Celda>
                  <Link href={`/productos?editar=${p.id}`} className="text-boligrafo underline">
                    Editar
                  </Link>
                </Celda>
              </Fila>
            );
          })}
        </Tabla>

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion ? `Editar «${enEdicion.name}»` : 'Nuevo producto'}
          </h2>

          <FormularioCrud
            key={enEdicion?.id ?? 'nuevo'}
            accion={guardarProducto}
            textoEnviar={enEdicion ? 'Guardar cambios' : 'Crear producto'}
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
                nombre: 'code',
                etiqueta: 'Código',
                valor: enEdicion?.code ?? '',
                ayuda: 'Código de barras o clave interna. Se puede buscar por él en la caja.',
              },
              {
                tipo: 'selector',
                nombre: 'categoryId',
                etiqueta: 'Categoría',
                valor: enEdicion?.categoryId ? String(enEdicion.categoryId) : '',
                vacio: 'Sin categoría',
                opciones: categorias.map((c) => ({ valor: String(c.id), texto: c.name })),
              },
              {
                tipo: 'numero',
                nombre: 'costPrice',
                etiqueta: 'Costo',
                valor: enEdicion?.costPrice ?? '0.00',
              },
              {
                tipo: 'numero',
                nombre: 'salePrice',
                etiqueta: 'Precio de venta',
                requerido: true,
                valor: enEdicion?.salePrice ?? '0.00',
              },
              {
                tipo: 'fecha',
                nombre: 'expiryDate',
                etiqueta: 'Caducidad',
                valor: enEdicion?.expiryDate ?? '',
              },
              {
                tipo: 'casilla',
                nombre: 'managesInventory',
                etiqueta: 'Maneja inventario',
                valor: enEdicion?.managesInventory ?? true,
                ayuda: 'Al activarlo se crea su existencia en todas las sucursales, en 0.',
              },
              {
                tipo: 'casilla',
                nombre: 'openPrice',
                etiqueta: 'Precio abierto',
                valor: enEdicion?.openPrice ?? false,
                ayuda:
                  'El cajero teclea el importe al cobrarlo (ej. impresión a color); el importe fijo de arriba no se usa.',
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: 'Activo',
                valor: enEdicion?.isActive ?? true,
                ayuda: 'Desactivarlo lo saca de la caja sin borrar su historial de ventas.',
              },
            ]}
          />

          {enEdicion && (
            <Link href="/productos" className="mt-3 block text-fino text-boligrafo underline">
              Cancelar edición
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
