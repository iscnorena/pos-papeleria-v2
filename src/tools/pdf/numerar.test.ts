import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { inicioValido, numerarPdf } from './numerar';

async function crearPdf(paginas: number): Promise<Uint8Array> {
  const documento = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) documento.addPage([200, 300]);
  return documento.save();
}

describe('inicioValido', () => {
  it('acepta enteros positivos tal cual', () => {
    expect(inicioValido(1)).toBe(1);
    expect(inicioValido(42)).toBe(42);
  });

  it('redondea decimales', () => {
    expect(inicioValido(2.7)).toBe(3);
  });

  it('cae en 1 si viene vacío, negativo o cero', () => {
    expect(inicioValido(NaN)).toBe(1);
    expect(inicioValido(0)).toBe(1);
    expect(inicioValido(-5)).toBe(1);
  });
});

describe('numerarPdf', () => {
  it('no cambia la cantidad de páginas', async () => {
    const bytes = await crearPdf(4);
    const numerado = await numerarPdf(bytes, 1);
    const documento = await PDFDocument.load(numerado);
    expect(documento.getPageCount()).toBe(4);
  });

  it('funciona con un número inicial distinto de 1', async () => {
    const bytes = await crearPdf(3);
    await expect(numerarPdf(bytes, 10)).resolves.not.toThrow();
  });

  it('agrega contenido real a cada página (el stream crece)', async () => {
    const bytes = await crearPdf(2);
    const antes = await PDFDocument.load(bytes);
    const numerado = await numerarPdf(bytes, 1);
    const despues = await PDFDocument.load(numerado);
    // No hay forma sencilla de leer texto de vuelta con pdf-lib; que el documento crezca
    // al agregar una fuente + texto por página es una señal indirecta razonable de que sí
    // se dibujó algo (se confirma visualmente con Playwright, ver fase-10-pdf.spec.ts).
    expect(numerado.byteLength).toBeGreaterThan(bytes.byteLength);
    expect(despues.getPageCount()).toBe(antes.getPageCount());
  });
});
