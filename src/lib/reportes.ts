import 'server-only';

import { and, count, desc, eq, gte, lt, sum, type SQL } from 'drizzle-orm';

import { POS, type MetodoPago } from '@/config/pos';
import { db } from '@/db';
import { branches, salePayments, sales, users } from '@/db/schema';
import { limitesDelDia } from '@/lib/fechas';
import { aCentavos } from '@/lib/money';
import type { Sesion } from '@/lib/sesion';

// Historial y reportes comparten filtros y totales. Viven juntos aquí para que el reporte
// diario y el historial del mismo día NO puedan discrepar — que es justo el criterio 1 de
// esta fase.

export type Filtros = {
  desde?: string; // YYYY-MM-DD, día natural del negocio
  hasta?: string; // YYYY-MM-DD inclusive
  branchId?: number;
  userId?: number;
  status?: 'completed' | 'cancelled';
};

/**
 * Traduce los filtros a condiciones SQL, aplicando SIEMPRE el alcance del rol: una cajera
 * solo ve lo suyo, pase lo que pase en la URL (§3).
 */
export function condicionesDe(filtros: Filtros, sesion: Sesion): SQL[] {
  const condiciones: SQL[] = [];

  // El rango se calcula en la zona del negocio, no en UTC (§2). Una venta de las 8 de la
  // noche del día 13 es del día 13, aunque para el servidor ya sean las 2 del día 14.
  if (filtros.desde) condiciones.push(gte(sales.createdAt, limitesDelDia(filtros.desde).desde));
  if (filtros.hasta) condiciones.push(lt(sales.createdAt, limitesDelDia(filtros.hasta).hasta));

  if (filtros.status) condiciones.push(eq(sales.status, filtros.status));

  if (sesion.rol === 'admin') {
    if (filtros.branchId) condiciones.push(eq(sales.branchId, filtros.branchId));
    if (filtros.userId) condiciones.push(eq(sales.userId, filtros.userId));
  } else {
    // No es un filtro más: es el muro. Una cajera no puede ampliar su alcance.
    condiciones.push(eq(sales.userId, sesion.userId));
  }

  return condiciones;
}

export type Totales = {
  ventas: number;
  ingreso: number;
  costo: number;
  ganancia: number;
  canceladas: number;
};

/** Totales del rango. Las canceladas se cuentan aparte y NO suman a ingreso ni ganancia. */
export async function totalesDe(filtros: Filtros, sesion: Sesion): Promise<Totales> {
  const base = condicionesDe({ ...filtros, status: undefined }, sesion);

  const [[completadas], [canceladas]] = await Promise.all([
    db
      .select({
        ventas: count(sales.id),
        ingreso: sum(sales.total),
        costo: sum(sales.totalCost),
        ganancia: sum(sales.profit),
      })
      .from(sales)
      .where(and(...base, eq(sales.status, 'completed'))),

    db
      .select({ n: count(sales.id) })
      .from(sales)
      .where(and(...base, eq(sales.status, 'cancelled'))),
  ]);

  return {
    ventas: completadas?.ventas ?? 0,
    ingreso: aCentavos(completadas?.ingreso ?? '0') ?? 0,
    costo: aCentavos(completadas?.costo ?? '0') ?? 0,
    ganancia: aCentavos(completadas?.ganancia ?? '0') ?? 0,
    canceladas: canceladas?.n ?? 0,
  };
}

export type DesgloseMetodo = {
  metodo: MetodoPago;
  nombre: string;
  total: number;
  transacciones: number;
};

/** Desglose por método de pago del rango, solo de ventas completadas. */
export async function desglosePorMetodo(
  filtros: Filtros,
  sesion: Sesion,
): Promise<DesgloseMetodo[]> {
  const base = condicionesDe({ ...filtros, status: undefined }, sesion);

  const filas = await db
    .select({
      metodo: salePayments.method,
      total: sum(salePayments.amount),
      transacciones: count(salePayments.id),
    })
    .from(salePayments)
    .innerJoin(sales, eq(salePayments.saleId, sales.id))
    .where(and(...base, eq(sales.status, 'completed')))
    .groupBy(salePayments.method);

  return (Object.keys(POS.metodosPago) as MetodoPago[]).map((metodo) => {
    const fila = filas.find((f) => f.metodo === metodo);
    return {
      metodo,
      nombre: POS.metodosPago[metodo],
      total: aCentavos(fila?.total ?? '0') ?? 0,
      transacciones: fila?.transacciones ?? 0,
    };
  });
}

/** Las ventas del rango, para el historial. */
export async function ventasDe(filtros: Filtros, sesion: Sesion, limite = 200) {
  return db
    .select({
      id: sales.id,
      folio: sales.ticketNumber,
      token: sales.publicToken,
      total: sales.total,
      ganancia: sales.profit,
      status: sales.status,
      createdAt: sales.createdAt,
      cajera: users.name,
      sucursal: branches.name,
    })
    .from(sales)
    .innerJoin(users, eq(sales.userId, users.id))
    .innerJoin(branches, eq(sales.branchId, branches.id))
    .where(and(...condicionesDe(filtros, sesion)))
    .orderBy(desc(sales.createdAt))
    .limit(limite);
}

/** Totales agrupados por sucursal, para el reporte de §Fase 5. */
export async function totalesPorSucursal(filtros: Filtros, sesion: Sesion) {
  const base = condicionesDe({ ...filtros, status: undefined }, sesion);
  return db
    .select({
      etiqueta: branches.name,
      ventas: count(sales.id),
      ingreso: sum(sales.total),
      costo: sum(sales.totalCost),
      ganancia: sum(sales.profit),
    })
    .from(sales)
    .innerJoin(branches, eq(sales.branchId, branches.id))
    .where(and(...base, eq(sales.status, 'completed')))
    .groupBy(branches.name)
    .orderBy(branches.name);
}

/** Totales agrupados por cajera. */
export async function totalesPorCajera(filtros: Filtros, sesion: Sesion) {
  const base = condicionesDe({ ...filtros, status: undefined }, sesion);
  return db
    .select({
      etiqueta: users.name,
      ventas: count(sales.id),
      ingreso: sum(sales.total),
      costo: sum(sales.totalCost),
      ganancia: sum(sales.profit),
    })
    .from(sales)
    .innerJoin(users, eq(sales.userId, users.id))
    .where(and(...base, eq(sales.status, 'completed')))
    .groupBy(users.name)
    .orderBy(users.name);
}
