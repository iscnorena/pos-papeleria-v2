import { describe, expect, it } from 'vitest';

import { mejoresCoincidencias, similitud } from './similitudTexto';

describe('similitud', () => {
  it('es 1 para textos idénticos', () => {
    expect(similitud('Bolígrafo tinta negra', 'Bolígrafo tinta negra')).toBe(1);
  });

  it('es 0 para textos sin nada en común', () => {
    expect(similitud('borrador', 'xyz123')).toBe(0);
  });

  it('ignora may/min y acentos', () => {
    expect(similitud('LAPIZ', 'lápiz')).toBeGreaterThan(0.9);
  });

  it('tolera una letra distinta (transcripción imperfecta)', () => {
    // "Bic" transcrito como "Bik".
    expect(similitud('lapicero bic', 'lapicero bik')).toBeGreaterThan(0.6);
  });

  it('un texto muy distinto da similitud baja', () => {
    expect(similitud('cuaderno profesional', 'engrapadora de escritorio')).toBeLessThan(0.2);
  });
});

describe('mejoresCoincidencias', () => {
  const catalogo = [
    { id: 1, nombre: 'Bolígrafo tinta negra' },
    { id: 2, nombre: 'Bolígrafo tinta azul' },
    { id: 3, nombre: 'Lápiz del número 2' },
    { id: 4, nombre: 'Engrapadora de escritorio' },
  ];

  it('ordena de mayor a menor similitud', () => {
    const resultado = mejoresCoincidencias('boligrafo azul', catalogo, (p) => p.nombre);
    expect(resultado[0]?.item.id).toBe(2);
  });

  it('respeta el límite', () => {
    const resultado = mejoresCoincidencias('boligrafo', catalogo, (p) => p.nombre, { limite: 1 });
    expect(resultado).toHaveLength(1);
  });

  it('filtra por debajo del umbral', () => {
    const resultado = mejoresCoincidencias('xyz nada que ver', catalogo, (p) => p.nombre, {
      umbral: 0.2,
    });
    expect(resultado).toEqual([]);
  });
});
