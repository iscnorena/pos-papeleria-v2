import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { db } from '@/db';
import { cashRegisterShifts, sales, shiftPayments, users } from '@/db/schema';
import { momento, tonoDiferencia } from '@/lib/formato';
import { aCentavos, formatear } from '@/lib/money';
import { requerirSesion } from '@/lib/sesion';
import { calcularCorte } from '@/lib/turnos';
import { POS, type MetodoPago } from '@/config/pos';

export default async function DetalleTurno({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion();
  const { id } = await params;
  const turnoId = Number(id);
  if (!Number.isInteger(turnoId)) notFound();

  const [turno] = await db
    .select({
      id: cashRegisterShifts.id,
      userId: cashRegisterShifts.userId,
      cajera: users.name,
      openingAmount: cashRegisterShifts.openingAmount,
      expectedCash: cashRegisterShifts.expectedCash,
      actualCash: cashRegisterShifts.actualCash,
      difference: cashRegisterShifts.difference,
      openedAt: cashRegisterShifts.openedAt,
      closedAt: cashRegisterShifts.closedAt,
      status: cashRegisterShifts.status,
      notes: cashRegisterShifts.notes,
    })
    .from(cashRegisterShifts)
    .innerJoin(users, eq(cashRegisterShifts.userId, users.id))
    .where(eq(cashRegisterShifts.id, turnoId))
    .limit(1);

  if (!turno) notFound();
  // §3: una cajera solo ve lo suyo. Un 404 en vez de un 403 a propósito: para ella, el
  // turno de otra persona sencillamente no existe.
  if (sesion.rol !== 'admin' && turno.userId !== sesion.userId) notFound();

  const fondo = aCentavos(turno.openingAmount) ?? 0;
  const cerrado = turno.status === 'closed';

  // Un turno cerrado muestra lo CONGELADO en `shift_payments`; uno abierto se calcula en
  // vivo. Esa es justamente la razón de congelarlo: el corte de ayer no debe moverse si
  // hoy se cancela una venta vieja (§7.5).
  const [resumen, desgloseCongelado, ventasDelTurno] = await Promise.all([
    calcularCorte(turno.id, fondo),
    cerrado
      ? db.select().from(shiftPayments).where(eq(shiftPayments.shiftId, turno.id))
      : Promise.resolve([]),
    db
      .select({
        id: sales.id,
        ticket: sales.ticketNumber,
        total: sales.total,
        status: sales.status,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .where(eq(sales.shiftId, turno.id))
      .orderBy(desc(sales.createdAt)),
  ]);

  const porMetodo = cerrado
    ? desgloseCongelado.map((f) => ({
        metodo: f.method as MetodoPago,
        nombre: POS.metodosPago[f.method as MetodoPago],
        total: aCentavos(f.totalAmount) ?? 0,
        transacciones: f.transactionCount,
      }))
    : resumen.porMetodo;

  const diferencia = turno.difference === null ? null : (aCentavos(turno.difference) ?? 0);

  return (
    <section>
      <EncabezadoPantalla titulo={`Turno #${turno.id}`} descripcion={`Cajera: ${turno.cajera}`}>
        {!cerrado && turno.userId === sesion.userId && (
          <Link
            href={`/turnos/${turno.id}/cerrar`}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-4 py-2 font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
          >
            Cerrar turno
          </Link>
        )}
      </EncabezadoPantalla>

      <dl className="mb-8 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-4">
        <Dato etiqueta="Estado">
          {cerrado ? (
            <Distintivo>Cerrado</Distintivo>
          ) : (
            <Distintivo tono="marcador">Abierto</Distintivo>
          )}
        </Dato>
        <Dato etiqueta="Abierto">{momento(turno.openedAt)}</Dato>
        <Dato etiqueta="Cerrado">{momento(turno.closedAt)}</Dato>
        <Dato etiqueta="Fondo de caja">{formatear(fondo)}</Dato>

        <Dato etiqueta="Ventas">{resumen.ventas}</Dato>
        <Dato etiqueta="Ingreso">{formatear(resumen.ingreso)}</Dato>
        <Dato etiqueta="Ganancia">{formatear(resumen.ganancia)}</Dato>
        <Dato etiqueta="Canceladas">{resumen.canceladas}</Dato>
      </dl>

      {cerrado && (
        <div className="mb-8 border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Corte</h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-fino text-grafito">Efectivo esperado</dt>
              <dd className="tabular font-mono text-cifra text-tinta">
                {formatear(aCentavos(turno.expectedCash ?? '0') ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-fino text-grafito">Efectivo contado</dt>
              <dd className="tabular font-mono text-cifra text-tinta">
                {formatear(aCentavos(turno.actualCash ?? '0') ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-fino text-grafito">Diferencia</dt>
              <dd
                className={`tabular font-mono text-cifra ${diferencia === null ? '' : tonoDiferencia(diferencia)}`}
              >
                {diferencia === null ? '—' : formatear(diferencia)}
              </dd>
            </div>
          </dl>
          {turno.notes && <p className="mt-4 text-base text-grafito">Nota: {turno.notes}</p>}
        </div>
      )}

      <h2 className="mb-3 font-display text-cuerpo font-semibold text-tinta">Por método de pago</h2>
      <Tabla encabezados={['Método', 'Transacciones', 'Total']}>
        {porMetodo.map((m) => (
          <Fila key={m.metodo}>
            <Celda>{m.nombre}</Celda>
            <Celda mono className="text-right">
              {m.transacciones}
            </Celda>
            <Celda mono className="text-right">
              {formatear(m.total)}
            </Celda>
          </Fila>
        ))}
      </Tabla>

      <h2 className="mb-3 mt-8 font-display text-cuerpo font-semibold text-tinta">
        Ventas del turno
      </h2>
      <Tabla encabezados={['Folio', 'Hora', 'Total', 'Estado']}>
        {ventasDelTurno.length === 0 && (
          <SinDatos columnas={4}>Este turno todavía no tiene ventas.</SinDatos>
        )}
        {ventasDelTurno.map((v) => (
          <Fila key={v.id}>
            <Celda mono>{v.ticket}</Celda>
            <Celda mono>{momento(v.createdAt)}</Celda>
            <Celda mono className="text-right">
              {formatear(aCentavos(v.total) ?? 0)}
            </Celda>
            <Celda>
              {v.status === 'cancelled' ? (
                <Distintivo tono="sello">Cancelada</Distintivo>
              ) : (
                <Distintivo tono="visto">Completada</Distintivo>
              )}
            </Celda>
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
