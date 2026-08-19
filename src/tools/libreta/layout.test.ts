import { describe, expect, it } from 'vitest';

import {
  CONTENT_HEIGHT,
  CONTENT_WIDTH,
  ESPACIO_RAYA_MM,
  MARGIN,
  MM,
  PAGE_WIDTH,
  alturaEncabezado,
  alturaRenglonEncabezado,
  areaDibujo,
  areaRayado,
  hexARgb,
  lineasEncabezado,
  posicionesCuadricula,
  posicionesDobleRaya,
  posicionesRaya,
  sanearTexto,
  xParaPosicion,
} from './layout';

describe('lineasEncabezado', () => {
  const vacio = {
    nombre: '',
    nombrePosicion: 'izquierda' as const,
    materia: '',
    materiaPosicion: 'izquierda' as const,
    fecha: '',
    fechaPosicion: 'izquierda' as const,
    gradoGrupo: '',
    gradoGrupoPosicion: 'izquierda' as const,
  };

  it('sin ningún campo, no hay encabezado', () => {
    expect(lineasEncabezado(vacio)).toEqual([]);
  });

  it('solo el nombre: un renglón, en negrita, con su propia posición', () => {
    const lineas = lineasEncabezado({ ...vacio, nombre: 'Juan Pérez', nombrePosicion: 'derecha' });
    expect(lineas).toEqual([
      { texto: 'Juan Pérez', tamano: 15, negrita: true, posicion: 'derecha' },
    ]);
  });

  it('cada dato presente es SU PROPIO renglón (nunca se juntan en una línea)', () => {
    const lineas = lineasEncabezado({
      ...vacio,
      materia: 'Español',
      fecha: '24 de agosto',
      gradoGrupo: '3° B',
    });
    expect(lineas.map((l) => l.texto)).toEqual(['Español', '24 de agosto', '3° B']);
  });

  it('con los cuatro campos, salen los cuatro renglones en orden fijo: nombre, materia, fecha, grado y grupo', () => {
    const lineas = lineasEncabezado({
      nombre: 'Ana',
      nombrePosicion: 'centro',
      materia: 'Historia',
      materiaPosicion: 'izquierda',
      fecha: '1 de septiembre',
      fechaPosicion: 'derecha',
      gradoGrupo: '5° A',
      gradoGrupoPosicion: 'izquierda',
    });
    expect(lineas.map((l) => ({ texto: l.texto, posicion: l.posicion }))).toEqual([
      { texto: 'Ana', posicion: 'centro' },
      { texto: 'Historia', posicion: 'izquierda' },
      { texto: '1 de septiembre', posicion: 'derecha' },
      { texto: '5° A', posicion: 'izquierda' },
    ]);
  });

  it('espacios en blanco cuentan como campo vacío', () => {
    expect(lineasEncabezado({ ...vacio, nombre: '   ' })).toEqual([]);
  });
});

describe('alturaEncabezado / areaRayado', () => {
  it('sin líneas, el área rayada ocupa todo el contenido', () => {
    expect(alturaEncabezado([])).toBe(0);
    expect(areaRayado([])).toEqual({ y: 0, alto: CONTENT_HEIGHT });
  });

  it('con líneas, se reserva la suma de cada renglón más el espacio tras el encabezado', () => {
    const lineas = lineasEncabezado({
      nombre: 'X',
      nombrePosicion: 'izquierda' as const,
      materia: '',
      materiaPosicion: 'izquierda' as const,
      fecha: '',
      fechaPosicion: 'izquierda' as const,
      gradoGrupo: '',
      gradoGrupoPosicion: 'izquierda' as const,
    });
    const { y, alto } = areaRayado(lineas);
    expect(y).toBeGreaterThan(0);
    expect(y + alto).toBe(CONTENT_HEIGHT);
    expect(alturaEncabezado(lineas)).toBeGreaterThan(alturaRenglonEncabezado(lineas[0]!.tamano));
  });

  it('más renglones ocupan más alto de encabezado', () => {
    const unSolo = lineasEncabezado({
      nombre: 'X',
      nombrePosicion: 'izquierda' as const,
      materia: '',
      materiaPosicion: 'izquierda' as const,
      fecha: '',
      fechaPosicion: 'izquierda' as const,
      gradoGrupo: '',
      gradoGrupoPosicion: 'izquierda' as const,
    });
    const cuatro = lineasEncabezado({
      nombre: 'X',
      nombrePosicion: 'izquierda' as const,
      materia: 'Y',
      materiaPosicion: 'izquierda' as const,
      fecha: 'Z',
      fechaPosicion: 'izquierda' as const,
      gradoGrupo: 'W',
      gradoGrupoPosicion: 'izquierda' as const,
    });
    expect(alturaEncabezado(cuatro)).toBeGreaterThan(alturaEncabezado(unSolo));
  });
});

describe('xParaPosicion', () => {
  it('izquierda queda pegado al margen', () => {
    expect(xParaPosicion('izquierda', 100)).toBe(MARGIN);
  });

  it('derecha deja el borde derecho del texto pegado al margen derecho', () => {
    const anchoTexto = 100;
    expect(xParaPosicion('derecha', anchoTexto)).toBe(PAGE_WIDTH - MARGIN - anchoTexto);
  });

  it('centro reparte el espacio sobrante en partes iguales', () => {
    const anchoTexto = 100;
    expect(xParaPosicion('centro', anchoTexto)).toBe(MARGIN + (CONTENT_WIDTH - anchoTexto) / 2);
  });
});

describe('posicionesRaya', () => {
  it('la primera línea queda un espacio abajo del borde superior, no pegada a él', () => {
    const posiciones = posicionesRaya(200);
    expect(posiciones[0]).toBeCloseTo(ESPACIO_RAYA_MM * MM, 6);
  });

  it('nunca se pasa del alto disponible', () => {
    const alto = 123;
    const posiciones = posicionesRaya(alto);
    for (const p of posiciones) expect(p).toBeLessThanOrEqual(alto);
  });

  it('el espaciado entre líneas consecutivas es constante', () => {
    const posiciones = posicionesRaya(200);
    for (let i = 1; i < posiciones.length; i++) {
      expect(posiciones[i]! - posiciones[i - 1]!).toBeCloseTo(ESPACIO_RAYA_MM * MM, 6);
    }
  });
});

describe('posicionesDobleRaya', () => {
  it('cada renglón es un par superior/inferior, superior siempre antes que inferior', () => {
    const bandas = posicionesDobleRaya(200);
    expect(bandas.length).toBeGreaterThan(0);
    for (const banda of bandas) expect(banda.superior).toBeLessThan(banda.inferior);
  });

  it('nunca se pasa del alto disponible', () => {
    const alto = 150;
    for (const banda of posicionesDobleRaya(alto)) {
      expect(banda.inferior).toBeLessThanOrEqual(alto);
    }
  });
});

describe('posicionesCuadricula', () => {
  it('cubre el ancho y el alto disponibles, desde el borde (0)', () => {
    const { horizontales, verticales } = posicionesCuadricula(100, 200, 10);
    expect(horizontales[0]).toBe(0);
    expect(verticales[0]).toBe(0);
    expect(horizontales.at(-1)).toBeLessThanOrEqual(100);
    expect(verticales.at(-1)).toBeLessThanOrEqual(200);
  });

  it('una celda más chica produce más líneas', () => {
    const chica = posicionesCuadricula(100, 100, 5);
    const grande = posicionesCuadricula(100, 100, 10);
    expect(chica.horizontales.length).toBeGreaterThan(grande.horizontales.length);
  });
});

describe('areaDibujo', () => {
  it('la caja ocupa una fracción del alto, y las líneas de texto quedan después', () => {
    const { alturaCaja, lineasTexto } = areaDibujo(400);
    expect(alturaCaja).toBeLessThan(400);
    expect(alturaCaja).toBeGreaterThan(0);
    for (const y of lineasTexto) expect(y).toBeGreaterThan(alturaCaja);
  });
});

describe('hexARgb', () => {
  it('convierte hex de 6 dígitos', () => {
    expect(hexARgb('#BE3A2E')).toEqual({
      r: 0xbe / 255,
      g: 0x3a / 255,
      b: 0x2e / 255,
    });
  });

  it('acepta hex de 3 dígitos', () => {
    expect(hexARgb('#FFF')).toEqual({ r: 1, g: 1, b: 1 });
    expect(hexARgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('sanearTexto', () => {
  const soloAscii = (codePoint: number) => codePoint < 128;

  it('deja pasar los caracteres soportados', () => {
    expect(sanearTexto('Juan Perez', soloAscii)).toBe('Juan Perez');
  });

  it('quita silenciosamente los que no, sin lanzar', () => {
    expect(() => sanearTexto('🎨 Dibujo', soloAscii)).not.toThrow();
    expect(sanearTexto('🎨 Dibujo', soloAscii)).toBe(' Dibujo');
  });
});
