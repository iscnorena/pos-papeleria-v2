import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { analizarOrden, reordenarPdf, textoOrdenActual, textoOrdenInvertido } from './reordenar';

async function crearPdf(anchos: number[]): Promise<Uint8Array> {
  const documento = await PDFDocument.create();
  for (const ancho of anchos) documento.addPage([ancho, 300]);
  return documento.save();
}

describe('analizarOrden', () => {
  it('acepta una permutación completa', () => {
    expect(analizarOrden('3, 1, 2', 3)).toEqual([3, 1, 2]);
  });

  it('lanza si faltan o sobran páginas', () => {
    expect(() => analizarOrden('1, 2', 3)).toThrow(/Tienes que listar las 3 páginas/);
    expect(() => analizarOrden('1, 2, 3, 4', 3)).toThrow(/Tienes que listar las 3 páginas/);
  });

  it('lanza si un número está fuera de rango', () => {
    expect(() => analizarOrden('1, 2, 9', 3)).toThrow(/no es una página válida/);
  });

  it('lanza si una página se repite', () => {
    expect(() => analizarOrden('1, 1, 2', 3)).toThrow(/una sola vez/);
  });
});

describe('textoOrdenActual', () => {
  it('da el orden 1..N tal cual', () => {
    expect(textoOrdenActual(4)).toBe('1, 2, 3, 4');
  });
});

describe('textoOrdenInvertido', () => {
  it('da el orden al revés', () => {
    expect(textoOrdenInvertido(4)).toBe('4, 3, 2, 1');
  });

  it('lo que produce lo vuelve a aceptar analizarOrden sin tronar', () => {
    expect(() => analizarOrden(textoOrdenInvertido(5), 5)).not.toThrow();
  });
});

describe('reordenarPdf', () => {
  it('reordena las páginas según se le pida', async () => {
    // Tres páginas de anchos distintos para poder distinguirlas después de reordenar.
    const bytes = await crearPdf([100, 200, 300]);
    const reordenado = await reordenarPdf(bytes, [3, 1, 2]);
    const documento = await PDFDocument.load(reordenado);
    expect(documento.getPages().map((p) => p.getWidth())).toEqual([300, 100, 200]);
  });

  it('el orden actual sin cambios da el mismo PDF', async () => {
    const bytes = await crearPdf([100, 200, 300]);
    const igual = await reordenarPdf(bytes, [1, 2, 3]);
    const documento = await PDFDocument.load(igual);
    expect(documento.getPages().map((p) => p.getWidth())).toEqual([100, 200, 300]);
  });
});
