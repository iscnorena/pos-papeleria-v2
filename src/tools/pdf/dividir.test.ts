import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { analizarRangos, dividirPdf, textoUnaPorPagina } from './dividir';

async function crearPdf(paginas: number): Promise<Uint8Array> {
  const documento = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) {
    const pagina = documento.addPage([200, 300]);
    // Cada página lleva su número como texto plano en el contenido, para poder
    // distinguirlas después del recorte sin depender de metadatos.
    pagina.drawText(String(i + 1), { x: 10, y: 10, size: 20 });
  }
  return documento.save();
}

describe('analizarRangos', () => {
  it('acepta números sueltos y rangos, separados por coma', () => {
    expect(analizarRangos('1-3, 5, 7-8', 10)).toEqual([
      { desde: 1, hasta: 3 },
      { desde: 5, hasta: 5 },
      { desde: 7, hasta: 8 },
    ]);
  });

  it('ignora espacios de más', () => {
    expect(analizarRangos('  1 - 2 ,   4  ', 10)).toEqual([
      { desde: 1, hasta: 2 },
      { desde: 4, hasta: 4 },
    ]);
  });

  it('lanza con mensaje claro si el texto está vacío', () => {
    expect(() => analizarRangos('', 10)).toThrow(/al menos un rango/);
    expect(() => analizarRangos('   ', 10)).toThrow(/al menos un rango/);
  });

  it('lanza si un trozo no tiene forma de rango', () => {
    expect(() => analizarRangos('1-3, abc', 10)).toThrow(/"abc" no es un rango válido/);
  });

  it('lanza si el rango viene invertido (desde > hasta)', () => {
    expect(() => analizarRangos('5-2', 10)).toThrow(/no es un rango válido/);
  });

  it('lanza si el rango se pasa del total de páginas', () => {
    expect(() => analizarRangos('1-15', 10)).toThrow(/solo tiene 10 páginas/);
  });
});

describe('textoUnaPorPagina', () => {
  it('arma un rango por cada página', () => {
    expect(textoUnaPorPagina(3)).toBe('1, 2, 3');
  });

  it('lo que produce lo vuelve a aceptar analizarRangos sin tronar', () => {
    expect(() => analizarRangos(textoUnaPorPagina(5), 5)).not.toThrow();
  });
});

describe('dividirPdf', () => {
  it('produce un archivo por rango, con las páginas correctas cada uno', async () => {
    const bytes = await crearPdf(6);
    const partes = await dividirPdf(bytes, [
      { desde: 1, hasta: 2 },
      { desde: 3, hasta: 6 },
    ]);

    expect(partes).toHaveLength(2);

    const parte1 = await PDFDocument.load(partes[0]!);
    expect(parte1.getPageCount()).toBe(2);

    const parte2 = await PDFDocument.load(partes[1]!);
    expect(parte2.getPageCount()).toBe(4);
  });

  it('un rango de una sola página produce un PDF de una página', async () => {
    const bytes = await crearPdf(3);
    const partes = await dividirPdf(bytes, [{ desde: 2, hasta: 2 }]);

    expect(partes).toHaveLength(1);
    const parte = await PDFDocument.load(partes[0]!);
    expect(parte.getPageCount()).toBe(1);
  });

  it('dividir "una página por archivo" da tantas partes como páginas', async () => {
    const bytes = await crearPdf(4);
    const rangos = Array.from({ length: 4 }, (_, i) => ({ desde: i + 1, hasta: i + 1 }));
    const partes = await dividirPdf(bytes, rangos);

    expect(partes).toHaveLength(4);
    for (const parte of partes) {
      const documento = await PDFDocument.load(parte);
      expect(documento.getPageCount()).toBe(1);
    }
  });
});
