import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { unirPdfs, type ArchivoPdf } from './unir';

async function crearPdf(paginas: number, ancho: number): Promise<Uint8Array> {
  const documento = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) documento.addPage([ancho, 200]);
  return documento.save();
}

async function archivo(
  id: string,
  nombre: string,
  paginas: number,
  ancho: number,
): Promise<ArchivoPdf> {
  const bytes = await crearPdf(paginas, ancho);
  return { id, nombre, bytes, paginas };
}

describe('unirPdfs', () => {
  it('junta las páginas de todos los archivos, en orden', async () => {
    const a = await archivo('a', 'a.pdf', 2, 100);
    const b = await archivo('b', 'b.pdf', 3, 200);

    const bytes = await unirPdfs([a, b]);
    const resultado = await PDFDocument.load(bytes);

    expect(resultado.getPageCount()).toBe(5);
    expect(resultado.getPages().map((p) => p.getWidth())).toEqual([100, 100, 200, 200, 200]);
  });

  it('respeta el orden del arreglo, no el orden en que se subieron', async () => {
    const a = await archivo('a', 'a.pdf', 1, 100);
    const b = await archivo('b', 'b.pdf', 1, 200);

    const bytes = await unirPdfs([b, a]);
    const resultado = await PDFDocument.load(bytes);

    expect(resultado.getPages().map((p) => p.getWidth())).toEqual([200, 100]);
  });

  it('un solo archivo se "une" igual, sin perder páginas', async () => {
    const a = await archivo('a', 'a.pdf', 3, 150);

    const bytes = await unirPdfs([a]);
    const resultado = await PDFDocument.load(bytes);

    expect(resultado.getPageCount()).toBe(3);
  });
});
