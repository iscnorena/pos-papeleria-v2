import { describe, expect, it } from 'vitest';

import {
  celdasDePagina,
  celdasPorPagina,
  cmAPx,
  CONFIG_POR_DEFECTO,
  paginaValida,
  pulgadasAPx,
  tamanoFijoDesborda,
  tamanoPagina,
  totalPaginas,
  type Config,
  type Imagen,
} from './layout-engine';
import { calcularTotal, PRECIOS_POR_DEFECTO } from './precios';

// §7.1 dice que este módulo es el que se prueba. Es el que decide qué se imprime y, por la
// tabla de precios, cuánto se cobra.

const config = (extra: Partial<Config> = {}): Config => ({ ...CONFIG_POR_DEFECTO, ...extra });
const imagenes = (n: number, aspecto = 1): Imagen[] =>
  Array.from({ length: n }, (_, i) => ({ id: `img-${i}`, aspecto }));

describe('unidades', () => {
  it('una pulgada son 96 px y un centímetro 96/2.54', () => {
    expect(pulgadasAPx(1)).toBe(96);
    expect(pulgadasAPx(8.5)).toBe(816);
    expect(cmAPx(2.54)).toBeCloseTo(96, 10);
    // El criterio 5 se mide con regla: 5cm tienen que ser exactamente estos px.
    expect(cmAPx(5)).toBeCloseTo(188.976, 3);
  });
});

describe('tamanoPagina', () => {
  it('Carta vertical son 8.5 × 11 pulgadas', () => {
    expect(tamanoPagina(config({ papel: 'Carta', orientacion: 'Vertical' }))).toEqual({
      ancho: 816,
      alto: 1056,
    });
  });

  it('horizontal intercambia ancho y alto', () => {
    expect(tamanoPagina(config({ papel: 'Carta', orientacion: 'Horizontal' }))).toEqual({
      ancho: 1056,
      alto: 816,
    });
  });

  it('Oficio mide 8.5 × 13', () => {
    expect(tamanoPagina(config({ papel: 'Oficio', orientacion: 'Vertical' })).alto).toBe(1248);
  });
});

describe('retícula', () => {
  it('reparte el espacio con las fórmulas de §7.1', () => {
    // Carta vertical, 2×2, márgenes de 0.5 y espaciado de 0.1
    const c = config({
      papel: 'Carta',
      orientacion: 'Vertical',
      filas: 2,
      columnas: 2,
      margenIzq: 0.5,
      margenDer: 0.5,
      margenSup: 0.5,
      margenInf: 0.5,
      espaciado: 0.1,
    });

    const celdas = celdasDePagina(c, imagenes(4), 0);
    expect(celdas).toHaveLength(4);

    // anchoDisponible = 816 − 48 − 48 − 9.6 = 710.4 → celda de 355.2
    expect(celdas[0]!.celda.ancho).toBeCloseTo(355.2, 6);
    // altoDisponible = 1056 − 48 − 48 − 9.6 = 950.4 → celda de 475.2
    expect(celdas[0]!.celda.alto).toBeCloseTo(475.2, 6);

    // La primera celda arranca en el margen.
    expect(celdas[0]!.celda.x).toBeCloseTo(48, 6);
    expect(celdas[0]!.celda.y).toBeCloseTo(48, 6);

    // La segunda columna se corre ancho + espaciado.
    expect(celdas[1]!.celda.x).toBeCloseTo(48 + 355.2 + 9.6, 6);
    expect(celdas[1]!.celda.y).toBeCloseTo(48, 6);

    // Y la segunda fila, alto + espaciado.
    expect(celdas[2]!.celda.y).toBeCloseTo(48 + 475.2 + 9.6, 6);
  });

  it('genera las celdas por filas, y ese orden decide dónde cae cada imagen', () => {
    const celdas = celdasDePagina(config({ filas: 2, columnas: 3 }), imagenes(6), 0);
    expect(celdas.map((c) => c.imagenId)).toEqual([
      'img-0',
      'img-1',
      'img-2', // fila 0 completa…
      'img-3',
      'img-4',
      'img-5', // …y luego la fila 1
    ]);
  });

  it('con márgenes de una pulgada por lado, las celdas se encogen y no desbordan', () => {
    // Criterio 6 de §7.8.
    const c = config({
      papel: 'Carta',
      orientacion: 'Vertical',
      filas: 2,
      columnas: 2,
      margenIzq: 1,
      margenDer: 1,
      margenSup: 1,
      margenInf: 1,
    });
    const { ancho: anchoPagina, alto: altoPagina } = tamanoPagina(c);
    const celdas = celdasDePagina(c, imagenes(4), 0);

    for (const { celda } of celdas) {
      expect(celda.x).toBeGreaterThanOrEqual(96 - 0.001);
      expect(celda.y).toBeGreaterThanOrEqual(96 - 0.001);
      expect(celda.x + celda.ancho).toBeLessThanOrEqual(anchoPagina - 96 + 0.001);
      expect(celda.y + celda.alto).toBeLessThanOrEqual(altoPagina - 96 + 0.001);
    }
  });
});

describe('colocación de la imagen', () => {
  it('maximizar llena la celda entera y deforma', () => {
    // Criterio 4 de §7.8, primera mitad.
    const celdas = celdasDePagina(config({ maximizar: true }), imagenes(1, 2), 0);
    const celda = celdas[0]!;
    expect(celda.imagen).toEqual(celda.celda);
    expect(celda.deformar).toBe(true);
  });

  it('sin maximizar, la imagen sale centrada y con su proporción', () => {
    // Criterio 4, segunda mitad: bandas vacías y proporción correcta.
    const c = config({
      maximizar: false,
      filas: 1,
      columnas: 1,
      papel: 'Carta',
      orientacion: 'Vertical',
    });
    const celdas = celdasDePagina(c, imagenes(1, 2), 0); // imagen apaisada 2:1
    const { celda, imagen, deformar } = celdas[0]!;

    expect(deformar).toBe(false);
    expect(imagen).not.toBeNull();
    // La celda es más alta que ancha, así que manda el ancho.
    expect(imagen!.ancho).toBeCloseTo(celda.ancho, 6);
    expect(imagen!.alto).toBeCloseTo(celda.ancho / 2, 6);
    // Centrada en vertical: quedan bandas arriba y abajo.
    expect(imagen!.y - celda.y).toBeCloseTo(celda.y + celda.alto - (imagen!.y + imagen!.alto), 6);
    expect(imagen!.alto).toBeLessThan(celda.alto);
  });

  it('el tamaño fijo mide exactamente lo pedido, en centímetros', () => {
    // Criterio 5 de §7.8, el que se comprueba con regla sobre la hoja impresa.
    const c = config({
      usarTamanoFijo: true,
      anchoFijoCm: 5,
      altoFijoCm: 5,
      papel: 'Carta',
      orientacion: 'Vertical',
    });
    const { celda, imagen, deformar } = celdasDePagina(c, imagenes(1), 0)[0]!;

    expect(imagen!.ancho).toBeCloseTo(cmAPx(5), 10);
    expect(imagen!.alto).toBeCloseTo(cmAPx(5), 10);
    expect(deformar).toBe(true);
    // Centrada en la celda.
    expect(imagen!.x - celda.x).toBeCloseTo(celda.x + celda.ancho - (imagen!.x + imagen!.ancho), 6);
  });

  it('el tamaño fijo gana sobre maximizar', () => {
    const c = config({ usarTamanoFijo: true, maximizar: true, anchoFijoCm: 3, altoFijoCm: 3 });
    const { imagen } = celdasDePagina(c, imagenes(1), 0)[0]!;
    expect(imagen!.ancho).toBeCloseTo(cmAPx(3), 10);
  });

  it('girar invierte el aspecto en el ajuste proporcional', () => {
    const base = config({ maximizar: false, filas: 1, columnas: 1 });
    const sinGirar = celdasDePagina(base, imagenes(1, 2), 0)[0]!;
    const girada = celdasDePagina({ ...base, rotar: true }, imagenes(1, 2), 0)[0]!;

    expect(girada.rotada).toBe(true);
    // Con el aspecto invertido (1/2 en vez de 2), ahora manda el alto.
    expect(girada.imagen!.alto).toBeCloseTo(sinGirar.celda.alto, 6);
    expect(girada.imagen!.ancho).toBeCloseTo(sinGirar.celda.alto / 2, 6);
  });
});

describe('paginación', () => {
  it('5 imágenes en 2×2 son dos páginas, y la segunda trae 3 celdas vacías', () => {
    // Criterio 1 de §7.8.
    const c = config({ filas: 2, columnas: 2 });
    expect(celdasPorPagina(c)).toBe(4);
    expect(totalPaginas(c, 5)).toBe(2);

    const primera = celdasDePagina(c, imagenes(5), 0);
    expect(primera.filter((x) => x.imagenId !== null)).toHaveLength(4);

    const segunda = celdasDePagina(c, imagenes(5), 1);
    expect(segunda.filter((x) => x.imagenId !== null)).toHaveLength(1);
    expect(segunda.filter((x) => x.imagen === null)).toHaveLength(3);
    expect(segunda[0]!.imagenId).toBe('img-4');
  });

  it('las mismas 5 imágenes en 3×3 caben en una hoja', () => {
    // Criterio 2 de §7.8, primera mitad.
    expect(totalPaginas(config({ filas: 3, columnas: 3 }), 5)).toBe(1);
  });

  it('sin imágenes sigue habiendo una página', () => {
    expect(totalPaginas(config(), 0)).toBe(1);
  });

  it('al cambiar de layout, una página fuera de rango se ajusta a la última válida', () => {
    const antes = config({ filas: 2, columnas: 2 }); // 5 imágenes → 2 páginas
    expect(paginaValida(antes, 5, 1)).toBe(1);

    const despues = config({ filas: 3, columnas: 3 }); // 5 imágenes → 1 página
    expect(paginaValida(despues, 5, 1)).toBe(0);
  });
});

describe('tamanoFijoDesborda', () => {
  it('avisa cuando el tamaño fijo no cabe en la celda', () => {
    // §7.7: el original dejaba que se desbordara en silencio.
    const cabe = config({ usarTamanoFijo: true, anchoFijoCm: 5, altoFijoCm: 5 });
    expect(tamanoFijoDesborda(cabe)).toBe(false);

    const noCabe = config({
      usarTamanoFijo: true,
      anchoFijoCm: 20,
      altoFijoCm: 20,
      filas: 3,
      columnas: 3,
    });
    expect(tamanoFijoDesborda(noCabe)).toBe(true);
  });

  it('sin tamaño fijo no hay nada que avisar', () => {
    expect(tamanoFijoDesborda(config({ usarTamanoFijo: false, anchoFijoCm: 99 }))).toBe(false);
  });
});

describe('precios (§7.2)', () => {
  const precios = PRECIOS_POR_DEFECTO;

  it('sin imágenes, cero', () => {
    expect(calcularTotal({ totalImagenes: 0, celdasPorPagina: 4, esColor: true, precios })).toBe(0);
  });

  it('en color cobra por imagen según el layout', () => {
    // Criterio 2 de §7.8: 5 imágenes pasan de 5 × 3.00 = $15.00 a 5 × 1.00 = $5.00
    expect(calcularTotal({ totalImagenes: 5, celdasPorPagina: 4, esColor: true, precios })).toBe(
      1500,
    );
    expect(calcularTotal({ totalImagenes: 5, celdasPorPagina: 9, esColor: true, precios })).toBe(
      500,
    );
    expect(calcularTotal({ totalImagenes: 1, celdasPorPagina: 1, esColor: true, precios })).toBe(
      1000,
    );
    expect(calcularTotal({ totalImagenes: 3, celdasPorPagina: 2, esColor: true, precios })).toBe(
      1500,
    );
    expect(calcularTotal({ totalImagenes: 2, celdasPorPagina: 6, esColor: true, precios })).toBe(
      400,
    );
  });

  it('en blanco y negro cobra por hoja', () => {
    // Criterio 3 de §7.8: 5 imágenes en 3×3 son una hoja → $1.00
    expect(calcularTotal({ totalImagenes: 5, celdasPorPagina: 9, esColor: false, precios })).toBe(
      100,
    );
    // 5 imágenes en 2×2 son dos hojas → $2.00
    expect(calcularTotal({ totalImagenes: 5, celdasPorPagina: 4, esColor: false, precios })).toBe(
      200,
    );
  });

  it('un layout fuera de la tabla usa el respaldo de $10.00 por imagen', () => {
    // Retícula personalizada 3×4 = 12 celdas, que no está en la tabla (§7.7).
    expect(calcularTotal({ totalImagenes: 3, celdasPorPagina: 12, esColor: true, precios })).toBe(
      3000,
    );
  });
});
