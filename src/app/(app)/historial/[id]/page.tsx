import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Celda, Fila, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import type { MetodoPago } from '@/config/pos';
import { db } from '@/db';
import { branches, salePayments, saleItems, sales, users } from '@/db/schema';
import { momento } from '@/lib/formato';
import { obtenerIdioma, t, type ClaveI18n } from '@/lib/i18n/servidor';
import { aCentavos, formatear, formatearCantidad } from '@/lib/money';
import { requerirSesion } from '@/lib/sesion';
import { BotonCancelar } from './BotonCancelar';

// `POS.metodosPago` es config de negocio (no se traduce ahí, ver caja/turnos): este mapa
// local apunta cada método a la misma clave del diccionario que ya usan esos módulos.
const ETIQUETA_METODO: Record<MetodoPago, ClaveI18n> = {
  cash: 'caja.efectivo',
  card: 'caja.tarjeta',
  transfer: 'caja.transferencia',
};

export default async function DetalleVenta({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();
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
        titulo={t(idioma, 'historial.ventaTitulo', { folio: venta.folio })}
        descripcion={`${venta.sucursal} · ${venta.cajera}`}
      >
        <div className="flex items-center gap-2">
          <Link
            href={`/ticket/${venta.token}`}
            target="_blank"
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-4 py-2 font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
          >
            {t(idioma, 'historial.verTicket')}
          </Link>
          {sesion.rol === 'admin' && !cancelada && (
            <BotonCancelar saleId={venta.id} folio={venta.folio} />
          )}
        </div>
      </EncabezadoPantalla>

      {cancelada && (
        <p className="mb-6 border border-sello bg-sello-tenue px-3 py-2 text-base text-sello-hondo">
          {t(idioma, 'historial.ventaCanceladaAviso')}
        </p>
      )}

      <dl className="mb-8 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-4">
        <Dato etiqueta={t(idioma, 'historial.colFecha')}>{momento(venta.createdAt, idioma)}</Dato>
        <Dato etiqueta={t(idioma, 'filtros.estado')}>
          {cancelada ? (
            <Distintivo tono="sello">{t(idioma, 'turnos.cancelada')}</Distintivo>
          ) : (
            <Distintivo tono="visto">{t(idioma, 'turnos.completada')}</Distintivo>
          )}
        </Dato>
        <Dato etiqueta={t(idioma, 'turnos.colTotal')}>
          {formatear(aCentavos(venta.total) ?? 0)}
        </Dato>
        {sesion.rol === 'admin' && (
          <Dato etiqueta={t(idioma, 'turnos.ganancia')}>
            {formatear(aCentavos(venta.ganancia) ?? 0)}
          </Dato>
        )}
      </dl>

      <h2 className="mb-3 font-display text-cuerpo font-semibold text-tinta">
        {t(idioma, 'historial.renglones')}
      </h2>
      <Tabla
        encabezados={[
          t(idioma, 'dashboard.colProducto'),
          t(idioma, 'caja.cantidad'),
          t(idioma, 'caja.precio'),
          t(idioma, 'caja.descuento'),
          t(idioma, 'caja.importe'),
        ]}
      >
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

      <h2 className="mb-3 mt-8 font-display text-cuerpo font-semibold text-tinta">
        {t(idioma, 'historial.pagos')}
      </h2>
      <Tabla
        encabezados={[
          t(idioma, 'turnos.colMetodo'),
          t(idioma, 'caja.importe'),
          t(idioma, 'historial.colReferencia'),
        ]}
      >
        {pagos.map((p) => (
          <Fila key={p.id}>
            <Celda>{t(idioma, ETIQUETA_METODO[p.method as MetodoPago])}</Celda>
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
