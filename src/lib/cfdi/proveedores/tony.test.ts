import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parsearCfdi } from '../parser';
import { extraerAddendaTony } from './tony';

const xmlValido = readFileSync(join(__dirname, '../fixtures/cfdi-tony-ejemplo.xml'), 'utf-8');

describe('extraerAddendaTony', () => {
  it('extrae los campos de BOVEDAFISCAL', () => {
    const resultado = parsearCfdi(xmlValido);
    if (!resultado.ok) throw new Error('fixture inválido');

    expect(extraerAddendaTony(resultado.crudo)).toEqual({
      tipoDoctoElectronico: 'FACTURA MAYOREO',
      almacen: 'MATRIZ',
      condicion: 'CONTADO',
      transaccion: '884521',
    });
  });

  it('devuelve null si no hay addenda', () => {
    const resultado = parsearCfdi(xmlValido.replace(/<cfdi:Addenda>[\s\S]*<\/cfdi:Addenda>/, ''));
    if (!resultado.ok) throw new Error('fixture inválido');
    expect(extraerAddendaTony(resultado.crudo)).toBeNull();
  });
});
