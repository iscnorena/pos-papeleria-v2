import 'server-only';

import { and, asc, count, desc, eq, sum } from 'drizzle-orm';

import { db } from '@/db';
import { cashRegisterShifts, sales, salePayments, shiftPayments, users } from '@/db/schema';
import { POS, type MetodoPago } from '@/config/pos';
import { aCentavos } from '@/lib/money';

// §7.5 — turnos de caja. Todo el dinero se maneja en centavos enteros (§2); las cadenas
// `numeric` de Postgres se convierten al entrar y al salir, y en ningún punto intermedio.

export type ResumenMetodo = {
  metodo: MetodoPago;
  nombre: string;
  total: number; // centavos
  transacciones: number;
};

export type Corte = {
  fondoDeCaja: number;
  efectivoDeVentas: number;
  efectivoEsperado: number;
  porMetodo: ResumenMetodo[];
  ventas: number;
  ingreso: number;
  ganancia: number;
  canceladas: number;
};

/** El turno abierto de un usuario, si tiene. Un usuario no puede tener dos (§7.5). */
export async function turnoAbiertoDe(userId: number) {
  const [turno] = await db
    .select()
    .from(cashRegisterShifts)
    .where(and(eq(cashRegisterShifts.userId, userId), eq(cashRegisterShifts.status, 'open')))
    .limit(1);
  return turno ?? null;
}

/**
 * Cuentas del turno. Las ventas **canceladas no cuentan** para nada de esto: ni para el
 * efectivo esperado, ni para el ingreso, ni para la ganancia (§7.5).
 *
 * Se calcula en vivo mientras el turno está abierto; al cerrarlo, el resultado se congela
 * en `shift_payments` y en las tres columnas del turno, para que el corte de ayer no
 * cambie si mañana se cancela una venta vieja.
 */
export async function calcularCorte(shiftId: number, fondoDeCajaCentavos: number): Promise<Corte> {
  const [porMetodoCrudo, [totales], [canceladas]] = await Promise.all([
    db
      .select({
        metodo: salePayments.method,
        total: sum(salePayments.amount),
        transacciones: count(salePayments.id),
      })
      .from(salePayments)
      .innerJoin(sales, eq(salePayments.saleId, sales.id))
      .where(and(eq(sales.shiftId, shiftId), eq(sales.status, 'completed')))
      .groupBy(salePayments.method),

    db
      .select({
        ventas: count(sales.id),
        ingreso: sum(sales.total),
        ganancia: sum(sales.profit),
      })
      .from(sales)
      .where(and(eq(sales.shiftId, shiftId), eq(sales.status, 'completed'))),

    db
      .select({ n: count(sales.id) })
      .from(sales)
      .where(and(eq(sales.shiftId, shiftId), eq(sales.status, 'cancelled'))),
  ]);

  // Todos los métodos aparecen siempre, aunque valgan cero: un corte con renglones que
  // aparecen y desaparecen es más difícil de leer que uno con ceros.
  const porMetodo: ResumenMetodo[] = (Object.keys(POS.metodosPago) as MetodoPago[]).map(
    (metodo) => {
      const fila = porMetodoCrudo.find((f) => f.metodo === metodo);
      return {
        metodo,
        nombre: POS.metodosPago[metodo],
        total: aCentavos(fila?.total ?? '0') ?? 0,
        transacciones: fila?.transacciones ?? 0,
      };
    },
  );

  const efectivoDeVentas = porMetodo.find((m) => m.metodo === 'cash')?.total ?? 0;

  return {
    fondoDeCaja: fondoDeCajaCentavos,
    efectivoDeVentas,
    efectivoEsperado: fondoDeCajaCentavos + efectivoDeVentas,
    porMetodo,
    ventas: totales?.ventas ?? 0,
    ingreso: aCentavos(totales?.ingreso ?? '0') ?? 0,
    ganancia: aCentavos(totales?.ganancia ?? '0') ?? 0,
    canceladas: canceladas?.n ?? 0,
  };
}

/** Congela el desglose por método en `shift_payments`. Se llama solo al cerrar. */
export async function congelarDesglose(shiftId: number, porMetodo: ResumenMetodo[]) {
  // Se guardan los tres métodos, incluidos los que quedaron en cero: el corte impreso
  // debe poder reconstruirse tal cual sin volver a consultar las ventas.
  await db
    .insert(shiftPayments)
    .values(
      porMetodo.map((m) => ({
        shiftId,
        method: m.metodo,
        totalAmount: (m.total / 100).toFixed(2),
        transactionCount: m.transacciones,
      })),
    )
    .onConflictDoNothing();
}

/** Turnos visibles para quien mira: la cajera solo los suyos, el admin todos (§3). */
export async function turnosVisibles(
  sesion: { userId: number; rol: string },
  paginacion?: { limite: number; offset: number },
) {
  const consulta = db
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
    })
    .from(cashRegisterShifts)
    .innerJoin(users, eq(cashRegisterShifts.userId, users.id))
    .$dynamic();

  const filtrada =
    sesion.rol === 'admin'
      ? consulta
      : consulta.where(eq(cashRegisterShifts.userId, sesion.userId));

  // El turno abierto primero: es el único sobre el que se puede actuar. El enum se ordena
  // por su orden de declaración —`open` antes que `closed`—, así que va ascendente.
  const ordenada = filtrada.orderBy(
    asc(cashRegisterShifts.status),
    desc(cashRegisterShifts.openedAt),
  );

  return paginacion ? ordenada.limit(paginacion.limite).offset(paginacion.offset) : ordenada;
}

/** Cuántos turnos ve esta sesión, para la paginación de `turnosVisibles`. */
export async function contarTurnosVisibles(sesion: {
  userId: number;
  rol: string;
}): Promise<number> {
  const consulta = db.select({ n: count() }).from(cashRegisterShifts).$dynamic();
  const filtrada =
    sesion.rol === 'admin'
      ? consulta
      : consulta.where(eq(cashRegisterShifts.userId, sesion.userId));
  const [fila] = await filtrada;
  return fila?.n ?? 0;
}
