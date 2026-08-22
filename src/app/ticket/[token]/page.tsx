import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';

import { POS, type MetodoPago } from '@/config/pos';
import { db } from '@/db';
import { branches, salePayments, saleItems, sales, users } from '@/db/schema';
import { momento } from '@/lib/formato';
import { obtenerIdioma, t, type ClaveI18n } from '@/lib/i18n/servidor';
import { aCentavos, formatear, formatearCantidad } from '@/lib/money';
import { BotonesTicket } from './BotonesTicket';
import './ticket.css';

// §6 — el ticket vive en una URL con token opaco para poder compartirlo sin que el cliente
// tenga cuenta. El token son 32 bytes aleatorios guardados en la venta, NO el id
// incremental: con el id, cualquiera recorrería los tickets del negocio contando.
//
// Esta ruta queda FUERA del grupo (app) a propósito: no lleva sesión ni navegación, y el
// `proxy` la deja pasar para que el enlace funcione desde el teléfono del cliente. El
// idioma también es independiente de la sesión de caja que generó la venta: la cookie es
// de ESTE navegador (el del cliente), así que el selector de `BotonesTicket` es propio.

const ETIQUETA_METODO: Record<MetodoPago, ClaveI18n> = {
  cash: 'caja.efectivo',
  card: 'caja.tarjeta',
  transfer: 'caja.transferencia',
};

export default async function Ticket({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const idioma = await obtenerIdioma();

  const [venta] = await db
    .select({
      id: sales.id,
      folio: sales.ticketNumber,
      subtotal: sales.subtotal,
      tax: sales.tax,
      discount: sales.discount,
      total: sales.total,
      status: sales.status,
      createdAt: sales.createdAt,
      cajera: users.name,
      sucursal: branches.name,
      direccion: branches.address,
      telefono: branches.phone,
    })
    .from(sales)
    .innerJoin(users, eq(sales.userId, users.id))
    .innerJoin(branches, eq(sales.branchId, branches.id))
    .where(eq(sales.publicToken, token))
    .limit(1);

  if (!venta) notFound();

  const [renglones, pagos] = await Promise.all([
    db.select().from(saleItems).where(eq(saleItems.saleId, venta.id)).orderBy(asc(saleItems.id)),
    db.select().from(salePayments).where(eq(salePayments.saleId, venta.id)),
  ]);

  const entregado = pagos.reduce((s, p) => s + (aCentavos(p.amount) ?? 0), 0);
  const total = aCentavos(venta.total) ?? 0;

  return (
    <main className="ticket">
      <BotonesTicket />

      <article className="cinta">
        <header className="centro">
          <h1 className="negocio">{POS.nombreNegocio}</h1>
          <p>{venta.sucursal}</p>
          {venta.direccion && <p>{venta.direccion}</p>}
          {venta.telefono && <p>{t(idioma, 'ticket.telefono', { telefono: venta.telefono })}</p>}
        </header>

        <hr />

        <p className="renglon">
          <span>{t(idioma, 'ticket.folio')}</span>
          <span>{venta.folio}</span>
        </p>
        <p className="renglon">
          <span>{t(idioma, 'ticket.fecha')}</span>
          <span>{momento(venta.createdAt, idioma)}</span>
        </p>
        <p className="renglon">
          <span>{t(idioma, 'ticket.leAtendio')}</span>
          <span>{venta.cajera}</span>
        </p>

        {venta.status === 'cancelled' && (
          <p className="cancelada">{t(idioma, 'ticket.ventaCancelada')}</p>
        )}

        <hr />

        <table>
          <tbody>
            {renglones.map((r) => {
              const cantidad = aCentavos(r.quantity) ?? 0;
              const descuento = aCentavos(r.discount) ?? 0;
              return (
                <tr key={r.id}>
                  <td className="concepto">
                    {r.productName}
                    <br />
                    <span className="detalle">
                      {formatearCantidad(cantidad)} × {formatear(aCentavos(r.unitPrice) ?? 0)}
                      {descuento > 0 && ` − ${formatear(descuento)}`}
                    </span>
                  </td>
                  <td className="importe">{formatear(aCentavos(r.subtotal) ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <hr />

        <p className="renglon">
          <span>{t(idioma, 'ticket.subtotal')}</span>
          <span>{formatear(aCentavos(venta.subtotal) ?? 0)}</span>
        </p>
        {(aCentavos(venta.tax) ?? 0) > 0 && (
          <p className="renglon">
            <span>{t(idioma, 'ticket.impuesto')}</span>
            <span>{formatear(aCentavos(venta.tax) ?? 0)}</span>
          </p>
        )}
        {(aCentavos(venta.discount) ?? 0) > 0 && (
          <p className="renglon">
            <span>{t(idioma, 'ticket.descuento')}</span>
            <span>−{formatear(aCentavos(venta.discount) ?? 0)}</span>
          </p>
        )}
        <p className="renglon total">
          <span>{t(idioma, 'ticket.total')}</span>
          <span>{formatear(total)}</span>
        </p>

        <hr />

        {pagos.map((p) => (
          <p className="renglon" key={p.id}>
            <span>{t(idioma, ETIQUETA_METODO[p.method as MetodoPago])}</span>
            <span>{formatear(aCentavos(p.amount) ?? 0)}</span>
          </p>
        ))}
        {entregado > total && (
          <p className="renglon">
            <span>{t(idioma, 'ticket.cambio')}</span>
            <span>{formatear(entregado - total)}</span>
          </p>
        )}

        <hr />

        <p className="centro pie">{t(idioma, 'ticket.pie')}</p>
      </article>
    </main>
  );
}
