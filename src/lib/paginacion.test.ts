import { describe, expect, it } from 'vitest';

import { offsetDePagina, paginaDeBusqueda, totalDePaginas } from './paginacion';

describe('paginaDeBusqueda', () => {
  it('lee un número válido', () => {
    expect(paginaDeBusqueda('3')).toBe(3);
  });

  it('nunca da menos de 1', () => {
    expect(paginaDeBusqueda('0')).toBe(1);
    expect(paginaDeBusqueda('-5')).toBe(1);
  });

  it('cae a 1 con texto inválido, vacío o ausente', () => {
    expect(paginaDeBusqueda('abc')).toBe(1);
    expect(paginaDeBusqueda('')).toBe(1);
    expect(paginaDeBusqueda(undefined)).toBe(1);
    expect(paginaDeBusqueda('2.5')).toBe(1);
  });
});

describe('offsetDePagina', () => {
  it('la página 1 no desplaza nada', () => {
    expect(offsetDePagina(1, 30)).toBe(0);
  });

  it('la página 3 con 30 por página desplaza 60', () => {
    expect(offsetDePagina(3, 30)).toBe(60);
  });
});

describe('totalDePaginas', () => {
  it('redondea hacia arriba', () => {
    expect(totalDePaginas(61, 30)).toBe(3);
    expect(totalDePaginas(60, 30)).toBe(2);
    expect(totalDePaginas(1, 30)).toBe(1);
  });

  it('una lista vacía sigue siendo 1 página, no 0', () => {
    expect(totalDePaginas(0, 30)).toBe(1);
  });
});
