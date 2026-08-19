import { describe, expect, it } from 'vitest';

import {
  ALTO_ENCABEZADO,
  CONTENT_HEIGHT,
  ESPACIO_RAYA_MM,
  MM,
  alturaEncabezado,
  areaDibujo,
  areaRayado,
  hexARgb,
  lineasEncabezado,
  posicionesCuadricula,
  posicionesDobleRaya,
  posicionesRaya,
  sanearTexto,
} from './layout';

describe('lineasEncabezado', () => {
  const vacio = { nombre: '', materia: '', fecha: '', gradoGrupo: '' };

  it('sin ningún campo, no hay encabezado', () => {
    expect(lineasEncabezado(vacio)).toEqual([]);
  });

  it('solo el nombre: una línea, en negrita', () => {
    const lineas = lineasEncabezado({ ...vacio, nombre: 'Juan Pérez' });
    expect(lineas).toEqual([{ texto: 'Juan Pérez', tamano: 15, negrita: true }]);
  });

  it('solo un dato secundario (sin nombre): una sola línea, sin negrita', () => {
    const lineas = lineasEncabezado({ ...vacio, materia: 'Matemáticas' });
    expect(lineas).toEqual([{ texto: 'Matemáticas', tamano: 10, negrita: false }]);
  });

  it('junta los datos secundarios presentes con "·", en orden materia/grado/fecha', () => {
    const lineas = lineasEncabezado({
      ...vacio,
      materia: 'Español',
      fecha: '24 de agosto',
      gradoGrupo: '3° B',
    });
    expect(lineas.at(-1)?.texto).toBe('Español   ·   3° B   ·   24 de agosto');
  });

  it('con todos los campos, salen las dos líneas en orden nombre / resto', () => {
    const lineas = lineasEncabezado({
      nombre: 'Ana',
      materia: 'Historia',
      fecha: '1 de septiembre',
      gradoGrupo: '5° A',
    });
    expect(lineas.map((l) => l.texto)).toEqual([
      'Ana',
      'Historia   ·   5° A   ·   1 de septiembre',
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

  it('con líneas, se reserva la banda fija más el espacio tras el encabezado', () => {
    const lineas = lineasEncabezado({ nombre: 'X', materia: '', fecha: '', gradoGrupo: '' });
    const { y, alto } = areaRayado(lineas);
    expect(y).toBeGreaterThan(0);
    expect(y + alto).toBe(CONTENT_HEIGHT);
    expect(alturaEncabezado(lineas)).toBe(ALTO_ENCABEZADO);
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
