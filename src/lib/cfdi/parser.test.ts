import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parsearCfdi } from './parser';

const xmlValido = readFileSync(join(__dirname, 'fixtures/cfdi-tony-ejemplo.xml'), 'utf-8');

describe('parsearCfdi', () => {
  it('parsea un CFDI 4.0 válido de Tony', () => {
    const resultado = parsearCfdi(xmlValido);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const { comprobante } = resultado;
    expect(comprobante.serie).toBe('333');
    expect(comprobante.folio).toBe('132595');
    expect(comprobante.subtotal).toBe(120000);
    expect(comprobante.total).toBe(139200);
    expect(comprobante.tipoComprobante).toBe('I');
    expect(comprobante.emisor).toEqual({
      rfc: 'STY850101AB1',
      nombre: 'SUPER PAPELERIAS TONY SA DE CV',
    });
    expect(comprobante.uuid).toBe('7A3B21F0-4C5D-4E9A-8B6F-1234567890AB');
    expect(comprobante.conceptos).toHaveLength(2);

    const [primero] = comprobante.conceptos;
    if (!primero) throw new Error('sin conceptos');
    expect(primero.noIdentificacion).toBe('07980376');
    expect(primero.descripcion).toBe('CUADERNO PROFESIONAL 100 HOJAS CUADRICULA');
    expect(primero.cantidad).toBe(1000); // 10.00 en centésimas
    expect(primero.valorUnitario).toBe(4009); // $40.09 en centavos
    expect(primero.importe).toBe(40090);
    expect(primero.tasaIva).toBeCloseTo(0.16);
    expect(primero.importeIva).toBe(6414);
  });

  it('rechaza XML mal formado', () => {
    const resultado = parsearCfdi('<cfdi:Comprobante><cfdi:Emisor></cfdi:Comprobante>');
    expect(resultado).toEqual({ ok: false, error: 'El archivo no es un XML válido.' });
  });

  it('rechaza un XML que no es CFDI', () => {
    const resultado = parsearCfdi('<algoDistinto><campo>valor</campo></algoDistinto>');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toMatch(/Comprobante/);
  });

  it('rechaza una versión distinta de 4.0', () => {
    const xml = xmlValido.replace('Version="4.0"', 'Version="3.3"');
    const resultado = parsearCfdi(xml);
    expect(resultado).toEqual({ ok: false, error: 'Solo se aceptan CFDI versión 4.0.' });
  });

  it('rechaza un comprobante que no es de tipo Ingreso', () => {
    const xml = xmlValido.replace('TipoDeComprobante="I"', 'TipoDeComprobante="E"');
    const resultado = parsearCfdi(xml);
    expect(resultado).toEqual({ ok: false, error: 'El comprobante no es de tipo Ingreso.' });
  });

  it('rechaza un CFDI sin Timbre Fiscal Digital', () => {
    const xml = xmlValido.replace(
      /<cfdi:Complemento>[\s\S]*<\/cfdi:Complemento>/,
      '<cfdi:Complemento></cfdi:Complemento>',
    );
    const resultado = parsearCfdi(xml);
    expect(resultado).toEqual({
      ok: false,
      error: 'Falta el Timbre Fiscal Digital (UUID) del comprobante.',
    });
  });
});
