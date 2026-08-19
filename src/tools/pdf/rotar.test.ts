import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { paginasARotar, rotarPdf } from './rotar';

async function crearPdf(paginas: number): Promise<Uint8Array> {
  const documento = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) documento.addPage([200, 300]);
  return documento.save();
}

describe('paginasARotar', () => {
  it('texto vacío significa "todas": null', () => {
    expect(paginasARotar('', 5)).toBeNull();
    expect(paginasARotar('   ', 5)).toBeNull();
  });

  it('convierte rangos a índices 0-indexados', () => {
    expect(paginasARotar('1-2, 4', 5)).toEqual(new Set([0, 1, 3]));
  });

  it('lanza si el rango es inválido, igual que analizarRangos', () => {
    expect(() => paginasARotar('9-20', 5)).toThrow(/solo tiene 5 páginas/);
  });
});

describe('rotarPdf', () => {
  it('rota todas las páginas cuando indices es null', async () => {
    const bytes = await crearPdf(3);
    const rotado = await rotarPdf(bytes, 90, null);
    const documento = await PDFDocument.load(rotado);
    for (const pagina of documento.getPages()) {
      expect(pagina.getRotation().angle).toBe(90);
    }
  });

  it('rota solo las páginas indicadas', async () => {
    const bytes = await crearPdf(3);
    const rotado = await rotarPdf(bytes, 90, new Set([1]));
    const documento = await PDFDocument.load(rotado);
    const angulos = documento.getPages().map((p) => p.getRotation().angle);
    expect(angulos).toEqual([0, 90, 0]);
  });

  it('suma a la rotación existente en vez de reemplazarla', async () => {
    const bytes = await crearPdf(1);
    const primero = await rotarPdf(bytes, 90, null);
    const segundo = await rotarPdf(primero, 90, null);
    const documento = await PDFDocument.load(segundo);
    expect(documento.getPages()[0]!.getRotation().angle).toBe(180);
  });

  it('da la vuelta completa: 270 + 90 = 0', async () => {
    const bytes = await crearPdf(1);
    const rotado270 = await rotarPdf(bytes, 270, null);
    const rotado360 = await rotarPdf(rotado270, 90, null);
    const documento = await PDFDocument.load(rotado360);
    expect(documento.getPages()[0]!.getRotation().angle).toBe(0);
  });
});
