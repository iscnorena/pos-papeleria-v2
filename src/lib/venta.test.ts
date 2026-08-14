import { describe, expect, it } from 'vitest';

import { aCentavos } from './money';
import { armarFolio, calcularRenglon, calcularVenta, repartirPagos } from './venta';

// La lógica de dinero y folios sí se prueba (§1): es la que descuadra una caja si falla.

const pesos = (texto: string) => aCentavos(texto)!;
const piezas = (n: number) => n * 100;

describe('calcularRenglon', () => {
  it('aplica el descuento del renglón después de multiplicar', () => {
    // 3 × $28.00 = $84.00, menos $4.00 de descuento = $80.00
    const r = calcularRenglon({
      cantidad: piezas(3),
      precioUnitario: pesos('28.00'),
      costoUnitario: pesos('18.00'),
      descuento: pesos('4.00'),
    });
    expect(r.subtotal).toBe(pesos('80.00'));
    expect(r.costo).toBe(pesos('54.00'));
    expect(r.ganancia).toBe(pesos('26.00'));
  });

  it('admite cantidades fraccionarias sin perder centavos', () => {
    // 1.5 metros a $13.33 = $19.995 → $20.00 (media unidad hacia arriba, §2)
    const r = calcularRenglon({
      cantidad: 150,
      precioUnitario: pesos('13.33'),
      costoUnitario: 0,
      descuento: 0,
    });
    expect(r.subtotal).toBe(pesos('20.00'));
  });
});

describe('calcularVenta', () => {
  it('sigue el orden exacto de §7.2', () => {
    const totales = calcularVenta(
      [
        {
          cantidad: piezas(2),
          precioUnitario: pesos('28.00'),
          costoUnitario: pesos('18.00'),
          descuento: 0,
        },
        {
          cantidad: piezas(1),
          precioUnitario: pesos('6.00'),
          costoUnitario: pesos('3.50'),
          descuento: 0,
        },
      ],
      pesos('2.00'), // descuento general
      0,
    );

    expect(totales.subtotal).toBe(pesos('62.00')); // 56 + 6
    expect(totales.impuesto).toBe(0);
    expect(totales.total).toBe(pesos('60.00')); // 62 + 0 − 2
    expect(totales.costoTotal).toBe(pesos('39.50')); // 36 + 3.50
    expect(totales.ganancia).toBe(pesos('20.50')); // 60 − 39.50
  });

  it('el descuento general sale de la ganancia, no del costo', () => {
    const sinDescuento = calcularVenta(
      [
        {
          cantidad: piezas(1),
          precioUnitario: pesos('100.00'),
          costoUnitario: pesos('60.00'),
          descuento: 0,
        },
      ],
      0,
    );
    const conDescuento = calcularVenta(
      [
        {
          cantidad: piezas(1),
          precioUnitario: pesos('100.00'),
          costoUnitario: pesos('60.00'),
          descuento: 0,
        },
      ],
      pesos('10.00'),
    );
    expect(sinDescuento.ganancia).toBe(pesos('40.00'));
    expect(conDescuento.ganancia).toBe(pesos('30.00'));
    expect(conDescuento.costoTotal).toBe(sinDescuento.costoTotal);
  });

  it('aplica el impuesto sobre el subtotal cuando la tasa no es cero', () => {
    const totales = calcularVenta(
      [{ cantidad: piezas(1), precioUnitario: pesos('100.00'), costoUnitario: 0, descuento: 0 }],
      0,
      0.16,
    );
    expect(totales.impuesto).toBe(pesos('16.00'));
    expect(totales.total).toBe(pesos('116.00'));
  });

  it('una venta vacía es cero, no un error', () => {
    expect(calcularVenta([]).total).toBe(0);
  });
});

describe('repartirPagos', () => {
  it('recorta cada pago al saldo restante para que el cambio no sea ingreso', () => {
    // El caso del criterio 2 de la Fase 4: $100 efectivo + $50 tarjeta para un total de $130.
    const resultado = repartirPagos(
      [
        { metodo: 'cash', monto: pesos('100.00') },
        { metodo: 'card', monto: pesos('50.00') },
      ],
      pesos('130.00'),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const suma = resultado.pagos.reduce((s, p) => s + p.monto, 0);
    expect(suma).toBe(pesos('130.00')); // exactamente el total, ni un centavo más
    expect(resultado.cambio).toBe(pesos('20.00'));
    expect(resultado.pagos).toEqual([
      { metodo: 'cash', monto: pesos('100.00') },
      { metodo: 'card', monto: pesos('30.00') }, // recortado
    ]);
  });

  it('con un solo pago que sobra, guarda el total y devuelve el cambio', () => {
    const resultado = repartirPagos([{ metodo: 'cash', monto: pesos('500.00') }], pesos('83.50'));
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.pagos).toHaveLength(1);
    expect(resultado.pagos[0]!.monto).toBe(pesos('83.50'));
    expect(resultado.cambio).toBe(pesos('416.50'));
  });

  it('rechaza el pago insuficiente con el mensaje de §7.2', () => {
    const resultado = repartirPagos([{ metodo: 'cash', monto: pesos('50.00') }], pesos('130.00'));
    expect(resultado).toEqual({ ok: false, error: 'El pago es insuficiente.' });
  });

  it('tolera un centavo de diferencia, pero no dos', () => {
    expect(repartirPagos([{ metodo: 'cash', monto: 9999 }], 10000).ok).toBe(true);
    expect(repartirPagos([{ metodo: 'cash', monto: 9998 }], 10000).ok).toBe(false);
  });

  it('sin pagos, lo dice en vez de guardar una venta regalada', () => {
    expect(repartirPagos([], pesos('10.00')).ok).toBe(false);
  });
});

describe('armarFolio', () => {
  it('produce el formato de §7.3', () => {
    expect(armarFolio('BR', 1, '20260813', 7)).toBe('BR1-20260813-0007');
    expect(armarFolio('BR', 2, '20261231', 1)).toBe('BR2-20261231-0001');
  });

  it('no recorta cuando pasa de cuatro dígitos', () => {
    expect(armarFolio('BR', 1, '20260813', 12345)).toBe('BR1-20260813-12345');
  });
});
