import { describe, expect, it } from 'vitest';

import { extraerItemsDeVoz, resolverItemsDeVoz } from './vozTicket';

describe('extraerItemsDeVoz', () => {
  it('separa por "lleva" repetido, el patrón del ejemplo de la spec', () => {
    const items = extraerItemsDeVoz(
      'lleva un borrador marca Dixon, lleva un lapicero marca Bic, ' +
        'lleva una libreta raya marca Escribe, lleva 4 libretas raya marca Swing',
    );
    expect(items).toEqual([
      { cantidad: 1, descripcion: 'borrador dixon' },
      { cantidad: 1, descripcion: 'lapicero bic' },
      { cantidad: 1, descripcion: 'libreta raya escribe' },
      { cantidad: 4, descripcion: 'libretas raya swing' },
    ]);
  });

  it('separa por comas y "y" con un solo "lleva" al inicio', () => {
    const items = extraerItemsDeVoz('lleva un borrador, un lapicero y dos libretas');
    expect(items).toEqual([
      { cantidad: 1, descripcion: 'borrador' },
      { cantidad: 1, descripcion: 'lapicero' },
      { cantidad: 2, descripcion: 'libretas' },
    ]);
  });

  it('funciona sin decir "lleva" en absoluto', () => {
    const items = extraerItemsDeVoz('un borrador y dos lapiceros');
    expect(items).toEqual([
      { cantidad: 1, descripcion: 'borrador' },
      { cantidad: 2, descripcion: 'lapiceros' },
    ]);
  });

  it('cantidad en dígitos y en palabra dan el mismo resultado', () => {
    expect(extraerItemsDeVoz('4 libretas')).toEqual([{ cantidad: 4, descripcion: 'libretas' }]);
    expect(extraerItemsDeVoz('cuatro libretas')).toEqual([
      { cantidad: 4, descripcion: 'libretas' },
    ]);
  });

  it('sin cantidad dictada, cantidad es null — nunca se asume 1 en silencio', () => {
    expect(extraerItemsDeVoz('libretas')).toEqual([{ cantidad: null, descripcion: 'libretas' }]);
  });

  it('transcripción vacía da lista vacía', () => {
    expect(extraerItemsDeVoz('')).toEqual([]);
    expect(extraerItemsDeVoz('   ')).toEqual([]);
  });

  it('ignora mayúsculas y espacios repetidos', () => {
    expect(extraerItemsDeVoz('  LLEVA   un   Borrador  ')).toEqual([
      { cantidad: 1, descripcion: 'borrador' },
    ]);
  });
});

describe('resolverItemsDeVoz', () => {
  const catalogo = [
    { id: 1, nombre: 'Cuaderno profesional raya 100 hojas' },
    { id: 2, nombre: 'Cuaderno profesional cuadro chico 100 hojas' },
    { id: 3, nombre: 'Bolígrafo tinta negra' },
  ];
  const clave = (p: (typeof catalogo)[number]) => p.nombre;

  it('resuelta: un candidato claramente por encima de los demás', () => {
    const [resultado] = resolverItemsDeVoz('boligrafo tinta negra', catalogo, clave);
    expect(resultado?.estado).toBe('resuelta');
    expect(resultado?.candidatos[0]?.item.id).toBe(3);
  });

  it('ambigua: varios candidatos parecidos entre sí, sin uno que destaque', () => {
    const [resultado] = resolverItemsDeVoz('cuaderno profesional 100 hojas', catalogo, clave);
    expect(resultado?.estado).toBe('ambigua');
    expect(resultado?.candidatos.length).toBeGreaterThan(1);
  });

  it('no_reconocida: nada por encima del umbral', () => {
    const [resultado] = resolverItemsDeVoz('xilofono de juguete', catalogo, clave);
    expect(resultado?.estado).toBe('no_reconocida');
    expect(resultado?.candidatos).toEqual([]);
  });

  it('conserva la cantidad dictada (o null) en el resultado', () => {
    const resultado = resolverItemsDeVoz('lleva 2 boligrafo tinta negra', catalogo, clave);
    expect(resultado[0]?.cantidad).toBe(2);
  });
});
