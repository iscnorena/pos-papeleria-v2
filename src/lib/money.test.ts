import { describe, expect, it } from 'vitest';

import { aCentavos, aPesos, formatear, formatearCantidad } from './money';

// §1 — la lógica de dinero sí se prueba. Es la que descuadra un corte de caja si falla.

describe('aCentavos', () => {
  it('convierte decimales normales', () => {
    expect(aCentavos('12.34')).toBe(1234);
    expect(aCentavos('0.05')).toBe(5);
    expect(aCentavos('100')).toBe(10000);
  });

  it('aguanta el texto tal como llega del mostrador', () => {
    expect(aCentavos('$1,234.56')).toBe(123456);
    expect(aCentavos(' 12.50 ')).toBe(1250);
    expect(aCentavos('12,5')).toBe(1250); // coma decimal
    expect(aCentavos('1.234,56')).toBe(123456); // formato europeo
    // Coma seguida de tres dígitos: separador de miles. Son 1234 pesos = 123400 centavos.
    expect(aCentavos('1,234')).toBe(123400);
  });

  it('devuelve null cuando no hay número', () => {
    expect(aCentavos('')).toBeNull();
    expect(aCentavos('   ')).toBeNull();
    expect(aCentavos('abc')).toBeNull();
    expect(aCentavos('.')).toBeNull();
    expect(aCentavos(null)).toBeNull();
    expect(aCentavos(undefined)).toBeNull();
  });

  it('redondea media unidad hacia arriba', () => {
    expect(aCentavos('0.005')).toBe(1);
    expect(aCentavos('0.004')).toBe(0);
  });
});

describe('la aritmética en centavos evita el error de coma flotante', () => {
  it('2.10 + 4.20 da exactamente 6.30', () => {
    // Este es el caso que motiva toda la regla: en flotantes da 6.300000000000001.
    expect(0.1 + 0.2 === 0.3).toBe(false);

    const a = aCentavos('2.10');
    const b = aCentavos('4.20');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a! + b!).toBe(630);
    expect(aPesos(a! + b!)).toBe('6.30');
  });

  it('sumar un centavo cien veces da exactamente un peso', () => {
    let total = 0;
    for (let i = 0; i < 100; i++) total += aCentavos('0.01')!;
    expect(total).toBe(100);
    expect(aPesos(total)).toBe('1.00');
  });
});

describe('aPesos', () => {
  it('siempre deja dos decimales, que es lo que espera numeric(12,2)', () => {
    expect(aPesos(1234)).toBe('12.34');
    expect(aPesos(0)).toBe('0.00');
    expect(aPesos(5)).toBe('0.05');
    expect(aPesos(100000)).toBe('1000.00');
  });

  it('ida y vuelta no pierde nada', () => {
    for (const texto of ['0.01', '9.99', '1234.56', '0.00']) {
      expect(aPesos(aCentavos(texto)!)).toBe(texto);
    }
  });
});

describe('formatear', () => {
  it('agrupa los miles y conserva el signo', () => {
    expect(formatear(123456)).toBe('$1,234.56');
    expect(formatear(0)).toBe('$0.00');
    expect(formatear(5)).toBe('$0.05');
    expect(formatear(-5000)).toBe('-$50.00');
    expect(formatear(100000000)).toBe('$1,000,000.00');
  });
});

describe('formatearCantidad', () => {
  it('no pone decimales de adorno', () => {
    expect(formatearCantidad(300)).toBe('3');
    expect(formatearCantidad(150)).toBe('1.50');
    expect(formatearCantidad(0)).toBe('0');
  });
});
