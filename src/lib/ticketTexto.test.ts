import { describe, expect, it } from 'vitest';

import { parsearTicketTexto } from './ticketTexto';

describe('parsearTicketTexto', () => {
  it('parsea líneas válidas, ignorando renglones en blanco', () => {
    const resultado = parsearTicketTexto(`
      3 | Cuaderno profesional 100 hojas | 25.50

      1 | Caja de lápices Faber Castell 12 pzas | 45.00
    `);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.lineas).toEqual([
      { cantidadTexto: '3', descripcion: 'Cuaderno profesional 100 hojas', costoTexto: '25.50' },
      {
        cantidadTexto: '1',
        descripcion: 'Caja de lápices Faber Castell 12 pzas',
        costoTexto: '45.00',
      },
    ]);
  });

  it('rechaza texto vacío o solo con líneas en blanco', () => {
    expect(parsearTicketTexto('').ok).toBe(false);
    expect(parsearTicketTexto('   \n   \n').ok).toBe(false);
  });

  it('rechaza una línea sin los 3 campos separados por |', () => {
    const resultado = parsearTicketTexto('3 | Cuaderno profesional 100 hojas');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain('línea 1');
  });

  it('rechaza una línea con más de 3 campos', () => {
    const resultado = parsearTicketTexto('3 | Cuaderno | 25.50 | extra');
    expect(resultado.ok).toBe(false);
  });

  it('rechaza una línea con un campo vacío', () => {
    const resultado = parsearTicketTexto('3 |  | 25.50');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain('campo vacío');
  });

  it('rechaza una línea con cantidad marcada como ? en vez de inventar un valor', () => {
    const resultado = parsearTicketTexto('? | Cuaderno profesional 100 hojas | 25.50');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain('cantidad legible');
  });

  it('rechaza una línea con costo marcado como ? en vez de inventar un valor', () => {
    const resultado = parsearTicketTexto('3 | Cuaderno profesional 100 hojas | ?');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain('costo legible');
  });

  it('reporta el número de línea que falla, no solo la primera', () => {
    const resultado = parsearTicketTexto(
      '3 | Cuaderno profesional 100 hojas | 25.50\n1 | Caja de lápices',
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain('línea 2');
  });
});
