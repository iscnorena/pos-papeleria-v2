import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Celda, Fila, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { POS, type MetodoPago } from '@/config/pos';
import { db } from '@/db';
import { branches, salePayments, saleItems, sales, users } from '@/db/schema';
import { momento } from '@/lib/formato';
import { aCentavos, formatear, formatearCantidad } from '@/lib/money';
import { requerirSesion } from '@/lib/sesion';
import { BotonCancelar } from './BotonCancelar';

export default async function DetalleVenta({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion();
  const { id } = await params;
  const ventaId = Number(id);
  if (!Number.isInteger(ventaId)) notFound();

  const [venta] = await db
    .select({
      id: sales.id,
      folio: sales.ticketNumber,
      token: sales.publicToken,
      userId: sales.userId,
      subtotal: sales.subtotal,
      tax: sales.tax,
      discount: sales.discount,
      total: sales.total,
      costo: sales.totalCost,
      ganancia: sales.profit,
      status: sales.status,
      createdAt: sales.createdAt,
      cajera: users.name,
      sucursal: branches.name,
    })
    .from(sales)
    .innerJoin(users, eq(sales.userId, users.id))
    .innerJoin(branches, eq(sales.branchId, branches.id))
    .where(eq(sales.id, ventaId))
    .limit(1);

  if (!venta) notFound();
  // Una cajera solo ve sus ventas (§3). Para ella, las de otra no existen.
  if (sesion.rol !== 'admin' && venta.userId !== sesion.userId) notFound();

  const [renglones, pagos] = await Promise.all([
    db.select().from(saleItems).where(eq(saleItems.saleId, venta.id)).orderBy(asc(saleItems.id)),
    db.select().from(salePayments).where(eq(salePayments.saleId, venta.id)),
  ]);

  const cancelada = venta.status === 'cancelled';

  return (
    <section>
      <EncabezadoPantalla
        titulo={`Venta ${venta.folio}`}
        descripcion={`${venta.sucursal} · ${venta.cajera}`}
      >
        <div className="flex items-center gap-2">
          <Link
            href={`/ticket/${venta.token}`}
            target="_blank"
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-4 py-2 font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
          >
            Ver ticket
          </Link>
          {sesion.rol === 'admin' && !cancelada && (
            <BotonCancelar saleId={venta.id} folio={venta.folio} />
          )}
        </div>
      </EncabezadoPantalla>

      {cancelada && (
        <p className="mb-6 border border-sello bg-sello-tenue px-3 py-2 text-base text-sello-hondo">
          Esta venta está cancelada. Sus existencias se devolvieron y no cuenta en los reportes.
        </p>
      )}

      <dl className="mb-8 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-4">
        <Dato etiqueta="Fecha">{momento(venta.createdAt)}</Dato>
        <Dato etiqueta="Estado">
          {cancelada ? (
            <Distintivo tono="sello">Cancelada</Distintivo>
          ) : (
            <Distintivo tono="visto">Completada</Distintivo>
          )}
        </Dato>
        <Dato etiqueta="Total">{formatear(aCentavos(venta.total) ?? 0)}</Dato>
        {sesion.rol === 'admin' && (
          <Dato etiqueta="Ganancia">{formatear(aCentavos(venta.ganancia) ?? 0)}</Dato>
        )}
      </dl>

      <h2 className="mb-3 font-display text-cuerpo font-semibold text-tinta">Renglones</h2>
      <Tabla encabezados={['Producto', 'Cantidad', 'Precio', 'Descuento', 'Importe']}>
        {renglones.map((r) => (
          <Fila key={r.id}>
            {/* `product_name` se copió al vender: si el producto cambió de nombre después,
                el ticket viejo sigue diciendo lo que decía (§7.2). */}
            <Celda>{r.productName}</Celda>
            <Celda mono className="text-right">
              {formatearCantidad(aCentavos(r.quantity) ?? 0)}
            </Celda>
            <Celda mono className="text-right">
              {formatear(aCentavos(r.unitPrice) ?? 0)}
            </Celda>
            <Celda mono className="text-right">
              {formatear(aCentavos(r.discount) ?? 0)}
            </Celda>
            <Celda mono className="text-right">
              {formatear(aCentavos(r.subtotal) ?? 0)}
            </Celda>
          </Fila>
        ))}
      </Tabla>

      <h2 className="mb-3 mt-8 font-display text-cuerpo font-semibold text-tinta">Pagos</h2>
      <Tabla encabezados={['Método', 'Importe', 'Referencia']}>
        {pagos.map((p) => (
          <Fila key={p.id}>
            <Celda>{POS.metodosPago[p.method as MetodoPago]}</Celda>
            <Celda mono className="text-right">
              {formatear(aCentavos(p.amount) ?? 0)}
            </Celda>
            <Celda mono>{p.reference ?? '—'}</Celda>
          </Fila>
        ))}
      </Tabla>
    </section>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="font-mono text-micro uppercase text-grafito-claro">{etiqueta}</dt>
      <dd className="mt-1 text-cuerpo text-tinta">{children}</dd>
    </div>
  );
}
