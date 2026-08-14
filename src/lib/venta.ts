import type { MetodoPago } from '@/config/pos';

// §7.2 — cálculo de una venta, portado sin cambios. Módulo puro: no toca la base ni la
// sesión, así que se prueba con Vitest y lo usan igual el carrito del navegador, la Server
// Action que guarda y el ticket.
//
// TODO el dinero está en centavos enteros (§2). Las cantidades están en centésimas, por la
// misma razón: hay cosas que se venden por metro o por kilo y `numeric(12,2)` las admite.

export type RenglonVenta = {
  /** Centésimas: 300 son 3 piezas, 150 son 1.5 metros. */
  cantidad: number;
  /** Centavos. */
  precioUnitario: number;
  /** Centavos. Copiado del producto al vender: el ticket viejo no cambia si sube el costo. */
  costoUnitario: number;
  /** Centavos, descuento del renglón. */
  descuento: number;
};

export type TotalesVenta = {
  subtotal: number;
  impuesto: number;
  descuentoGeneral: number;
  total: number;
  costoTotal: number;
  ganancia: number;
};

export type TotalesRenglon = { subtotal: number; ganancia: number; costo: number };

/**
 * Un renglón. El orden de las operaciones es el de §7.2 y no se toca:
 *
 *   subtotalRenglón = precioUnitario × cantidad − descuentoRenglón
 *   gananciaRenglón = subtotalRenglón − (costoUnitario × cantidad)
 *
 * El redondeo ocurre al multiplicar por la cantidad —única vez que puede aparecer una
 * fracción de centavo— y no vuelve a ocurrir después (§2).
 */
export function calcularRenglon(renglon: RenglonVenta): TotalesRenglon {
  const bruto = Math.round((renglon.precioUnitario * renglon.cantidad) / 100);
  const costo = Math.round((renglon.costoUnitario * renglon.cantidad) / 100);
  const subtotal = bruto - renglon.descuento;
  return { subtotal, costo, ganancia: subtotal - costo };
}

export function calcularVenta(
  renglones: RenglonVenta[],
  descuentoGeneral = 0,
  tasaImpuesto = 0,
): TotalesVenta {
  let subtotal = 0;
  let costoTotal = 0;

  for (const renglon of renglones) {
    const r = calcularRenglon(renglon);
    subtotal += r.subtotal;
    costoTotal += r.costo;
  }

  const impuesto = Math.round(subtotal * tasaImpuesto);
  const total = subtotal + impuesto - descuentoGeneral;

  return {
    subtotal,
    impuesto,
    descuentoGeneral,
    total,
    costoTotal,
    // Sobre el total, no sobre el subtotal: el descuento general sale de la ganancia.
    ganancia: total - costoTotal,
  };
}

// ── Pagos ──────────────────────────────────────────────────────────────────────────

export type PagoPropuesto = { metodo: MetodoPago; monto: number; referencia?: string };
export type PagoGuardable = { metodo: MetodoPago; monto: number; referencia?: string };

/** Tolerancia de §7.2: por debajo de un centavo del total, se rechaza. */
export const TOLERANCIA_PAGO = 1;

export type ResultadoPagos =
  { ok: false; error: string } | { ok: true; pagos: PagoGuardable[]; cambio: number };

/**
 * Reparte los pagos contra el total (§7.2).
 *
 * Cada pago se **recorta al saldo restante**, de modo que el cambio nunca se registre como
 * ingreso: si el cliente da $100 por una cuenta de $80, se guardan $80 y los $20 son
 * cambio, no venta. El cambio se muestra en pantalla y no se guarda.
 */
export function repartirPagos(propuestos: PagoPropuesto[], total: number): ResultadoPagos {
  const entregado = propuestos.reduce((suma, p) => suma + p.monto, 0);

  if (propuestos.length === 0 || entregado <= 0) {
    return { ok: false, error: 'Falta registrar el pago.' };
  }
  if (entregado < total - TOLERANCIA_PAGO) {
    return { ok: false, error: 'El pago es insuficiente.' };
  }

  const pagos: PagoGuardable[] = [];
  let restante = total;

  for (const propuesto of propuestos) {
    if (restante <= 0) break; // Lo que sobra es cambio, no un pago más.
    const monto = Math.min(propuesto.monto, restante);
    if (monto <= 0) continue;
    pagos.push({
      metodo: propuesto.metodo,
      monto,
      ...(propuesto.referencia ? { referencia: propuesto.referencia } : {}),
    });
    restante -= monto;
  }

  return { ok: true, pagos, cambio: Math.max(0, entregado - total) };
}

// ── Folio (§7.3) ───────────────────────────────────────────────────────────────────

/**
 * Arma el folio a partir del número que devolvió el contador atómico de la tabla `folios`.
 * Formato: `{prefijo}{branchId}-{YYYYMMDD}-{0001}`, por ejemplo `BR1-20260813-0007`.
 *
 * La fecha llega ya resuelta en la zona del negocio: aquí no se calcula ningún día, para
 * que este módulo siga siendo puro.
 */
export function armarFolio(
  prefijo: string,
  branchId: number,
  fechaYYYYMMDD: string,
  numero: number,
): string {
  return `${prefijo}${branchId}-${fechaYYYYMMDD}-${String(numero).padStart(4, '0')}`;
}
