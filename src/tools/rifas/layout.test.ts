import { describe, expect, it } from 'vitest';

import {
  AVAILABLE_HEIGHT,
  ROW_HEIGHT,
  TICKETS_PER_PAGE,
  anchoNumero,
  esFondoOscuro,
  formatearNumero,
  lineasHeader,
  numerosDePagina,
  porPaginaValido,
  sanearTexto,
  totalPaginas,
} from './layout';

describe('TICKETS_PER_PAGE', () => {
  it('sale de la fórmula, no de un literal', () => {
    expect(TICKETS_PER_PAGE).toBe(Math.floor(AVAILABLE_HEIGHT / ROW_HEIGHT));
    expect(TICKETS_PER_PAGE).toBe(18);
  });
});

describe('anchoNumero', () => {
  it('mínimo 3 dígitos aunque la cantidad sea chica', () => {
    expect(anchoNumero({ quantity: 9, startNumber: 1 })).toBe(3);
  });

  it('crece con la cantidad de dígitos del último número', () => {
    expect(anchoNumero({ quantity: 100, startNumber: 1 })).toBe(3);
    expect(anchoNumero({ quantity: 5000, startNumber: 1 })).toBe(4);
  });

  it('toma en cuenta un número inicial distinto de 1', () => {
    expect(anchoNumero({ quantity: 10, startNumber: 995 })).toBe(4); // último = 1004
  });
});

describe('formatearNumero', () => {
  it('rellena con ceros a la izquierda', () => {
    expect(formatearNumero(1, 3)).toBe('001');
    expect(formatearNumero(500, 3)).toBe('500');
  });
});

describe('porPaginaValido', () => {
  it('acota entre 1 y TICKETS_PER_PAGE', () => {
    expect(porPaginaValido(0)).toBe(1);
    expect(porPaginaValido(-5)).toBe(1);
    expect(porPaginaValido(TICKETS_PER_PAGE + 100)).toBe(TICKETS_PER_PAGE);
    expect(porPaginaValido(10)).toBe(10);
  });

  it('cae en TICKETS_PER_PAGE si viene vacío/NaN', () => {
    expect(porPaginaValido(NaN)).toBe(TICKETS_PER_PAGE);
  });
});

describe('totalPaginas', () => {
  it('redondea hacia arriba con el máximo por página', () => {
    expect(totalPaginas(18, TICKETS_PER_PAGE)).toBe(1);
    expect(totalPaginas(19, TICKETS_PER_PAGE)).toBe(2);
    expect(totalPaginas(100, TICKETS_PER_PAGE)).toBe(6); // 18*5=90, sobran 10
  });

  it('con menos boletos por página salen más páginas', () => {
    expect(totalPaginas(20, 10)).toBe(2);
    expect(totalPaginas(30, 10)).toBe(3);
  });

  it('nunca deja pasar más de TICKETS_PER_PAGE aunque se pida más', () => {
    expect(totalPaginas(TICKETS_PER_PAGE, TICKETS_PER_PAGE + 50)).toBe(1);
    expect(totalPaginas(TICKETS_PER_PAGE + 1, TICKETS_PER_PAGE + 50)).toBe(2);
  });
});

describe('numerosDePagina', () => {
  const base = {
    quantity: 50,
    startNumber: 1,
    ticketsPorPagina: TICKETS_PER_PAGE,
    eventName: '',
    prize: '',
    date: '',
    cost: '',
    organizer: '',
    phone: '',
  };

  it('la primera página trae TICKETS_PER_PAGE números empezando en startNumber', () => {
    const numeros = numerosDePagina(base, 0);
    expect(numeros).toHaveLength(TICKETS_PER_PAGE);
    expect(numeros[0]).toBe('001');
    expect(numeros.at(-1)).toBe(String(TICKETS_PER_PAGE).padStart(3, '0'));
  });

  it('la última página trae solo lo que sobra', () => {
    const totalPag = totalPaginas(base.quantity, base.ticketsPorPagina);
    const numeros = numerosDePagina(base, totalPag - 1);
    const sobran = base.quantity - TICKETS_PER_PAGE * (totalPag - 1);
    expect(numeros).toHaveLength(sobran);
    expect(numeros.at(-1)).toBe('050');
  });

  it('respeta un startNumber distinto de 1', () => {
    const numeros = numerosDePagina({ ...base, startNumber: 100, quantity: 5 }, 0);
    expect(numeros).toEqual(['100', '101', '102', '103', '104']);
  });

  it('respeta un ticketsPorPagina menor al máximo', () => {
    const config = { ...base, quantity: 25, ticketsPorPagina: 10 };
    expect(numerosDePagina(config, 0)).toHaveLength(10);
    expect(numerosDePagina(config, 1)).toHaveLength(10);
    expect(numerosDePagina(config, 2)).toHaveLength(5);
    expect(totalPaginas(config.quantity, config.ticketsPorPagina)).toBe(3);
  });

  it('nunca supera TICKETS_PER_PAGE aunque se pida más', () => {
    const config = { ...base, quantity: 40, ticketsPorPagina: 999 };
    expect(numerosDePagina(config, 0)).toHaveLength(TICKETS_PER_PAGE);
  });
});

describe('esFondoOscuro', () => {
  it('detecta la tinta del proyecto como oscura', () => {
    expect(esFondoOscuro('#17212F')).toBe(true);
  });

  it('detecta blanco como claro', () => {
    expect(esFondoOscuro('#FFFFFF')).toBe(false);
  });

  it('acepta hex de 3 dígitos', () => {
    expect(esFondoOscuro('#000')).toBe(true);
    expect(esFondoOscuro('#FFF')).toBe(false);
  });
});

describe('sanearTexto', () => {
  const soloAscii = (codePoint: number) => codePoint < 128;

  it('deja pasar los caracteres soportados', () => {
    expect(sanearTexto('Rifa 2026', soloAscii)).toBe('Rifa 2026');
  });

  it('quita silenciosamente los que no, sin lanzar', () => {
    expect(() => sanearTexto('🎉 Rifa Navideña 🎁', soloAscii)).not.toThrow();
    expect(sanearTexto('🎉 Rifa', soloAscii)).toBe(' Rifa');
  });

  it('quita emoji compuestos de más de un code point sin dejar restos sueltos', () => {
    // "👨‍👩‍👧" son varios code points unidos por ZWJ; ninguno es ASCII.
    expect(sanearTexto('Familia 👨‍👩‍👧 rifa', soloAscii)).toBe('Familia  rifa');
  });
});

describe('lineasHeader', () => {
  const vacio = { eventName: '', prize: '', date: '', cost: '', organizer: '', phone: '' };

  it('omite el "|" si falta fecha o costo', () => {
    expect(lineasHeader({ ...vacio, date: '15 dic' }).map((l) => l.texto)).toEqual([
      'Fecha: 15 dic',
    ]);
    expect(lineasHeader({ ...vacio, cost: '50' }).map((l) => l.texto)).toEqual(['Costo: $50']);
    expect(lineasHeader({ ...vacio, date: '15 dic', cost: '50' }).map((l) => l.texto)).toEqual([
      'Fecha: 15 dic  |  Costo: $50',
    ]);
  });

  it('el costo siempre lleva "$" al frente, lo haya tecleado el usuario o no', () => {
    expect(lineasHeader({ ...vacio, cost: '50' }).map((l) => l.texto)).toEqual(['Costo: $50']);
    expect(lineasHeader({ ...vacio, cost: '$50' }).map((l) => l.texto)).toEqual(['Costo: $50']);
    expect(lineasHeader({ ...vacio, cost: '$ 50' }).map((l) => l.texto)).toEqual(['Costo: $50']);
  });

  it('omite la línea de contacto si no hay organizador ni teléfono', () => {
    expect(lineasHeader(vacio)).toEqual([]);
  });

  it('junta organizador y teléfono con un guion solo si están los dos', () => {
    expect(lineasHeader({ ...vacio, organizer: 'Juan' }).map((l) => l.texto)).toEqual(['Juan']);
    expect(
      lineasHeader({ ...vacio, organizer: 'Juan', phone: '744...' }).map((l) => l.texto),
    ).toEqual(['Juan - 744...']);
  });

  it('respeta el orden: evento, premio, fecha/costo, contacto', () => {
    const lineas = lineasHeader({
      eventName: 'Rifa navideña',
      prize: 'Una tele',
      date: '24 dic',
      cost: '$20',
      organizer: 'Juan',
      phone: '744...',
    });
    expect(lineas.map((l) => l.texto)).toEqual([
      'Rifa navideña',
      'Premio: Una tele',
      'Fecha: 24 dic  |  Costo: $20',
      'Juan - 744...',
    ]);
    expect(lineas[0]).toMatchObject({ tamano: 18, negrita: true, secundario: false });
  });

  it('marca esPremio solo en la línea de premio, para saber dónde va la miniatura', () => {
    const lineas = lineasHeader({ ...vacio, eventName: 'Rifa', prize: 'Una tele', date: '24 dic' });
    expect(lineas.map((l) => l.esPremio ?? false)).toEqual([false, true, false]);
  });
});
