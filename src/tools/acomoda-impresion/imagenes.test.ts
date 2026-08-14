import { describe, expect, it } from 'vitest';

import { reordenar } from './imagenes';

// El reordenado es puro y sí se prueba: es el criterio 7 de §7.8 («arrastras la imagen 3
// sobre la posición de la 1 → se reordenan»). El arrastre en sí lo prueba Playwright.

describe('reordenar', () => {
  it('mueve un elemento hacia atrás', () => {
    // La imagen 3 (índice 2) va a la posición de la 1 (índice 0).
    expect(reordenar(['a', 'b', 'c', 'd'], 2, 0)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('mueve un elemento hacia adelante', () => {
    expect(reordenar(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('mover a la misma posición no cambia nada', () => {
    const lista = ['a', 'b', 'c'];
    expect(reordenar(lista, 1, 1)).toBe(lista);
  });

  it('los índices fuera de rango se ignoran en vez de romper la lista', () => {
    const lista = ['a', 'b'];
    expect(reordenar(lista, 5, 0)).toBe(lista);
    expect(reordenar(lista, 0, -1)).toBe(lista);
  });

  it('no muta la lista original', () => {
    const lista = ['a', 'b', 'c'];
    reordenar(lista, 0, 2);
    expect(lista).toEqual(['a', 'b', 'c']);
  });
});
