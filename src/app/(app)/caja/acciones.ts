'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import { POS } from '@/config/pos';
import { db } from '@/db';
import {
  cashRegisterShifts,
  folios,
  inventories,
  products,
  salePayments,
  saleItems,
  sales,
} from '@/db/schema';
import { diaCompacto, diaDelNegocio } from '@/lib/fechas';
import { obtenerIdioma, t, type Idioma } from '@/lib/i18n/servidor';
import { aPesos, aCentavos } from '@/lib/money';
import type { Resultado } from '@/lib/resultado';
import { requerirSesion } from '@/lib/sesion';
import { armarFolio, calcularRenglon, calcularVenta, repartirPagos } from '@/lib/venta';

// El mensaje de cada validación depende del idioma de quien cobra, así que el esquema es
// una función (no una constante de módulo) que arma los mensajes con `t()` una vez
// resuelto el idioma de la sesión.
function esquema(idioma: Idioma) {
  return z.object({
    renglones: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          cantidad: z.number().int().positive(t(idioma, 'caja.cantidadMayorCero')),
          descuento: z.number().int().min(0),
          // Solo se usa para productos marcados `openPrice` en el catálogo; para el resto se
          // ignora y el precio se relee de la base (ver comentario de `registrarVenta`).
          precioUnitario: z.number().int().min(0).max(POS.precioAbiertoMaximo).optional(),
        }),
      )
      .min(1, t(idioma, 'caja.carritoVacio')),
    descuentoGeneral: z.number().int().min(0),
    pagos: z
      .array(
        z.object({
          metodo: z.enum(['cash', 'card', 'transfer']),
          monto: z.number().int().min(0),
          referencia: z.string().trim().max(60).optional(),
        }),
      )
      .min(1, t(idioma, 'caja.faltaRegistrarPago')),
  });
}

export type VentaRegistrada = {
  id: number;
  folio: string;
  token: string;
  total: number;
  cambio: number;
};

/**
 * Registra la venta. Todo ocurre dentro de UNA transacción (§7.4): venta, renglones,
 * pagos, inventario y folio. O queda todo, o no queda nada.
 *
 * Nada de lo que manda el cliente se cree: los precios y costos se releen de la base, y
 * los totales se recalculan aquí. El navegador solo dice QUÉ se vende y CUÁNTO se paga.
 */
export async function registrarVenta(entrada: unknown): Promise<Resultado<VentaRegistrada>> {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();

  const analisis = esquema(idioma).safeParse(entrada);
  if (!analisis.success) {
    return {
      ok: false,
      error: analisis.error.issues[0]?.message ?? t(idioma, 'caja.revisaLaVenta'),
    };
  }
  const { renglones, descuentoGeneral, pagos: pagosPropuestos } = analisis.data;

  // §7.5 — sin turno abierto no se vende.
  const [turno] = await db
    .select()
    .from(cashRegisterShifts)
    .where(and(eq(cashRegisterShifts.userId, sesion.userId), eq(cashRegisterShifts.status, 'open')))
    .limit(1);
  if (!turno) return { ok: false, error: t(idioma, 'caja.noTienesTurnoAbierto') };

  // Precios y costos SIEMPRE de la base, nunca del cliente.
  const ids = renglones.map((r) => r.productId);
  const catalogo = await db
    .select({
      id: products.id,
      name: products.name,
      salePrice: products.salePrice,
      costPrice: products.costPrice,
      managesInventory: products.managesInventory,
      openPrice: products.openPrice,
      isActive: products.isActive,
    })
    .from(products)
    .where(inArray(products.id, ids));

  const porId = new Map(catalogo.map((p) => [p.id, p]));
  for (const renglon of renglones) {
    const producto = porId.get(renglon.productId);
    if (!producto) return { ok: false, error: t(idioma, 'caja.productoYaNoExiste') };
    if (!producto.isActive) {
      return { ok: false, error: t(idioma, 'caja.yaNoEstaALaVenta', { nombre: producto.name }) };
    }
    if (producto.openPrice && !(renglon.precioUnitario && renglon.precioUnitario > 0)) {
      return { ok: false, error: t(idioma, 'caja.faltaElPrecioDe', { nombre: producto.name }) };
    }
  }

  const conPrecios = renglones.map((renglon) => {
    const producto = porId.get(renglon.productId)!;
    return {
      ...renglon,
      nombre: producto.name,
      manejaInventario: producto.managesInventory,
      // Precio abierto es la única excepción a "el precio siempre sale de la base": el
      // catálogo marcó ese producto como tal, y ya se validó arriba que trae un importe.
      precioUnitario: producto.openPrice
        ? renglon.precioUnitario!
        : (aCentavos(producto.salePrice) ?? 0),
      costoUnitario: aCentavos(producto.costPrice) ?? 0,
    };
  });

  const totales = calcularVenta(conPrecios, descuentoGeneral, POS.tasaImpuesto);
  if (totales.total < 0) {
    return { ok: false, error: t(idioma, 'caja.descuentoNoPuedeSuperarTotal') };
  }

  const reparto = repartirPagos(pagosPropuestos, totales.total);
  if (!reparto.ok) return { ok: false, error: reparto.error };

  const ahora = new Date();
  const dia = diaDelNegocio(ahora);
  const token = randomBytes(32).toString('hex');

  try {
    const venta = await db.transaction(async (tx) => {
      // ── Inventario (§7.4) ────────────────────────────────────────────────────────
      // La condición `stock >= cantidad` va DENTRO del UPDATE: si dos cajas venden el
      // último cuaderno a la vez, solo una encuentra fila que actualizar. Comprobar antes
      // y actualizar después dejaría el stock en −1.
      for (const renglon of conPrecios) {
        if (!renglon.manejaInventario) continue;

        const cantidad = aPesos(renglon.cantidad);
        const actualizadas = await tx
          .update(inventories)
          .set({ stock: sql`${inventories.stock} - ${cantidad}` })
          .where(
            and(
              eq(inventories.productId, renglon.productId),
              eq(inventories.branchId, sesion.branchId),
              sql`${inventories.stock} >= ${cantidad}`,
            ),
          )
          .returning({ stock: inventories.stock });

        if (actualizadas.length === 0) {
          // Aborta la transacción entera: no queda ni media venta.
          throw new SinExistencia(renglon.nombre);
        }
      }

      // ── Folio (§7.3) ─────────────────────────────────────────────────────────────
      // Contador atómico por sucursal y día. Contar ventas existentes se rompe en
      // serverless: dos instancias leerían el mismo último número.
      const [contador] = await tx
        .insert(folios)
        .values({ branchId: sesion.branchId, date: dia, lastNumber: 1 })
        .onConflictDoUpdate({
          target: [folios.branchId, folios.date],
          set: { lastNumber: sql`${folios.lastNumber} + 1` },
        })
        .returning({ lastNumber: folios.lastNumber });

      if (!contador) throw new Error('No se pudo generar el folio.');
      const folio = armarFolio(
        POS.prefijoTicket,
        sesion.branchId,
        diaCompacto(ahora),
        contador.lastNumber,
      );

      // ── Venta, renglones y pagos ─────────────────────────────────────────────────
      const [creada] = await tx
        .insert(sales)
        .values({
          ticketNumber: folio,
          publicToken: token,
          userId: sesion.userId,
          branchId: sesion.branchId,
          shiftId: turno.id,
          subtotal: aPesos(totales.subtotal),
          tax: aPesos(totales.impuesto),
          discount: aPesos(totales.descuentoGeneral),
          total: aPesos(totales.total),
          totalCost: aPesos(totales.costoTotal),
          profit: aPesos(totales.ganancia),
        })
        .returning({ id: sales.id });

      if (!creada) throw new Error('No se pudo guardar la venta.');

      await tx.insert(saleItems).values(
        conPrecios.map((renglon) => {
          const r = calcularRenglon(renglon);
          return {
            saleId: creada.id,
            productId: renglon.productId,
            productName: renglon.nombre,
            quantity: aPesos(renglon.cantidad),
            unitCost: aPesos(renglon.costoUnitario),
            unitPrice: aPesos(renglon.precioUnitario),
            discount: aPesos(renglon.descuento),
            subtotal: aPesos(r.subtotal),
            profit: aPesos(r.ganancia),
          };
        }),
      );

      await tx.insert(salePayments).values(
        reparto.pagos.map((pago) => ({
          saleId: creada.id,
          method: pago.metodo,
          amount: aPesos(pago.monto),
          reference: pago.referencia ?? null,
        })),
      );

      return { id: creada.id, folio };
    });

    revalidatePath('/caja');
    revalidatePath('/turnos');

    return {
      ok: true,
      data: {
        id: venta.id,
        folio: venta.folio,
        token,
        total: totales.total,
        cambio: reparto.cambio,
      },
    };
  } catch (error) {
    if (error instanceof SinExistencia) {
      return {
        ok: false,
        error: t(idioma, 'caja.sinExistenciaSuficienteDe', { nombre: error.producto }),
      };
    }
    return { ok: false, error: t(idioma, 'caja.noSePudoCobrar') };
  }
}

/** Error propio para distinguir la falta de existencia de una caída de verdad. */
class SinExistencia extends Error {
  constructor(readonly producto: string) {
    super(`Sin existencia suficiente de ${producto}.`);
    this.name = 'SinExistencia';
  }
}
