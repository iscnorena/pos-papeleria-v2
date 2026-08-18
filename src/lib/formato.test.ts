import { describe, expect, it } from 'vitest';

import { tamanoArchivo } from './formato';

describe('tamanoArchivo', () => {
  it('en bytes por debajo de 1 KB', () => {
    expect(tamanoArchivo(500)).toBe('500 B');
  });

  it('en KB entre 1 KB y 1 MB', () => {
    expect(tamanoArchivo(2048)).toBe('2 KB');
  });

  it('en MB con un decimal a partir de 1 MB', () => {
    expect(tamanoArchivo(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
