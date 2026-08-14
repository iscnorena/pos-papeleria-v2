import { describe, expect, it } from 'vitest';

import { diaCompacto, diaDelNegocio, limitesDelDia } from './fechas';

// §2 — el día natural es el de `America/Mexico_City`, no el del servidor. Estas pruebas
// existen porque la primera versión de `limitesDelDia` dependía de la zona de la máquina:
// daba bien en Vercel (UTC) y mal en un equipo configurado en hora de México.

describe('diaDelNegocio', () => {
  it('una venta de las 8 de la noche pertenece a ese día, no al siguiente', () => {
    // 2026-08-14T02:30Z son las 20:30 del día 13 en la Ciudad de México.
    expect(diaDelNegocio(new Date('2026-08-14T02:30:00Z'))).toBe('2026-08-13');
  });

  it('a las 6:01 UTC ya cambió el día en México', () => {
    expect(diaDelNegocio(new Date('2026-08-13T05:59:00Z'))).toBe('2026-08-12');
    expect(diaDelNegocio(new Date('2026-08-13T06:01:00Z'))).toBe('2026-08-13');
  });

  it('el formato compacto del folio no lleva guiones', () => {
    expect(diaCompacto(new Date('2026-08-14T02:30:00Z'))).toBe('20260813');
  });
});

describe('limitesDelDia', () => {
  it('el día del negocio empieza a las 06:00 UTC en horario estándar', () => {
    const { desde, hasta } = limitesDelDia('2026-08-13');
    expect(desde.toISOString()).toBe('2026-08-13T06:00:00.000Z');
    expect(hasta.toISOString()).toBe('2026-08-14T06:00:00.000Z');
  });

  it('la venta nocturna cae dentro de su día y fuera del siguiente', () => {
    const venta = new Date('2026-08-14T02:30:00Z'); // 20:30 del 13, hora local

    const dia13 = limitesDelDia('2026-08-13');
    expect(venta >= dia13.desde && venta < dia13.hasta).toBe(true);

    const dia14 = limitesDelDia('2026-08-14');
    expect(venta >= dia14.desde && venta < dia14.hasta).toBe(false);
  });

  it('los días son contiguos: el fin de uno es el principio del siguiente', () => {
    expect(limitesDelDia('2026-08-13').hasta.getTime()).toBe(
      limitesDelDia('2026-08-14').desde.getTime(),
    );
  });

  it('el rango dura 24 horas', () => {
    const { desde, hasta } = limitesDelDia('2026-01-15');
    expect(hasta.getTime() - desde.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
