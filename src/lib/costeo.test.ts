import { describe, expect, it } from 'vitest';

import { calcularCostoConsolidado, costoVarioSignificativamente } from './costeo';

describe('calcularCostoConsolidado', () => {
  it('sin candidatos con costo, no toca costPrice', () => {
    expect(calcularCostoConsolidado([])).toBeNull();
    expect(
      calcularCostoConsolidado([
        { supplierId: 1, isPreferred: false, lastCost: 100, lastCostAt: null },
      ]),
    ).toBeNull();
  });

  it('regla ultima_compra: usa el costo más reciente sin importar proveedor', () => {
    const candidatos = [
      { supplierId: 1, isPreferred: false, lastCost: 4009, lastCostAt: new Date('2026-01-01') },
      { supplierId: 2, isPreferred: false, lastCost: 3800, lastCostAt: new Date('2026-02-01') },
    ];
    expect(calcularCostoConsolidado(candidatos, 'ultima_compra')).toBe(3800);
  });

  it('regla proveedor_preferido: usa el preferido aunque no sea el más reciente', () => {
    const candidatos = [
      { supplierId: 1, isPreferred: true, lastCost: 4009, lastCostAt: new Date('2026-01-01') },
      { supplierId: 2, isPreferred: false, lastCost: 3800, lastCostAt: new Date('2026-02-01') },
    ];
    expect(calcularCostoConsolidado(candidatos, 'proveedor_preferido')).toBe(4009);
  });

  it('regla proveedor_preferido sin preferido cae a última compra', () => {
    const candidatos = [
      { supplierId: 1, isPreferred: false, lastCost: 4009, lastCostAt: new Date('2026-01-01') },
      { supplierId: 2, isPreferred: false, lastCost: 3800, lastCostAt: new Date('2026-02-01') },
    ];
    expect(calcularCostoConsolidado(candidatos, 'proveedor_preferido')).toBe(3800);
  });

  it('ignora candidatos sin costo registrado', () => {
    const candidatos = [
      { supplierId: 1, isPreferred: false, lastCost: 4009, lastCostAt: new Date('2026-01-01') },
      { supplierId: 2, isPreferred: false, lastCost: 0, lastCostAt: null },
    ];
    expect(calcularCostoConsolidado(candidatos, 'ultima_compra')).toBe(4009);
  });
});

describe('costoVarioSignificativamente', () => {
  it('sin costo anterior, nunca alerta', () => {
    expect(costoVarioSignificativamente(4009, null)).toBe(false);
    expect(costoVarioSignificativamente(4009, 0)).toBe(false);
  });

  it('alerta cuando la variación excede la fracción', () => {
    expect(costoVarioSignificativamente(5000, 4000, 0.15)).toBe(true); // +25%
  });

  it('no alerta dentro de la tolerancia', () => {
    expect(costoVarioSignificativamente(4200, 4000, 0.15)).toBe(false); // +5%
  });
});
