import { expect, test, type Page } from '@playwright/test';

import {
  abrirTurnoDe,
  entrarComo,
  leerStock,
  limpiarRastrosE2E,
  limpiarTurnos,
  prepararProducto,
  sucursalPorNombre,
  tokenDeVenta,
  ventasRecientes,
} from './ayudas';

// Los 7 criterios de aceptación de la Fase 4. El 7 (que el ticket quepa en 80mm) se
// comprueba hasta donde llega el navegador: ancho de la cinta y regla `@page`. Con el
// papel puesto en la impresora lo tiene que ver una persona.

/** Agrega un producto al carrito buscándolo por su código. */
async function agregarPorCodigo(page: Page, codigo: string) {
  const buscador = page.getByLabel('Buscar producto');
  await buscador.fill(codigo);
  await buscador.press('Enter');
}

test.beforeEach(async () => {
  await limpiarTurnos();
  await limpiarRastrosE2E();
});

test.afterAll(async () => {
  await limpiarTurnos();
  await limpiarRastrosE2E();
});

test('1 · vender tres productos descuenta las existencias correctas, y solo de su sucursal', async ({
  page,
}) => {
  const principal = await sucursalPorNombre('Principal');
  const segunda = await sucursalPorNombre('Sucursal 2');

  const a = await prepararProducto({
    code: 'E2E-A',
    nombre: 'Prueba A',
    precio: '10.00',
    costo: '5.00',
    stock: '20.00',
  });
  const b = await prepararProducto({
    code: 'E2E-B',
    nombre: 'Prueba B',
    precio: '20.00',
    costo: '9.00',
    stock: '20.00',
  });
  const c = await prepararProducto({
    code: 'E2E-C',
    nombre: 'Prueba C',
    precio: '30.00',
    costo: '12.00',
    stock: '20.00',
  });

  await abrirTurnoDe('cajera', '500.00');
  await entrarComo(page, 'cajera');
  await page.goto('/caja');

  // Cantidades distintas: 1 de A, 3 de B, 2 de C → total 10 + 60 + 60 = $130.00
  await agregarPorCodigo(page, 'E2E-A');
  await agregarPorCodigo(page, 'E2E-B');
  await agregarPorCodigo(page, 'E2E-B');
  await agregarPorCodigo(page, 'E2E-B');
  await agregarPorCodigo(page, 'E2E-C');
  await agregarPorCodigo(page, 'E2E-C');

  // Se acota al ticket: el importe también vive dentro del modal de cobro, que está en el
  // DOM aunque esté cerrado — así funciona `<dialog>`.
  // El total es el único importe resaltado en `marcador` (§4): sirve de ancla exacta,
  // porque sin descuento el subtotal vale lo mismo.
  const ticket = page.getByRole('complementary', { name: 'Ticket' });
  await expect(ticket.locator('.bg-marcador')).toHaveText('$130.00');

  await page.getByRole('button', { name: 'Cobrar (F12)' }).click();
  await page.getByLabel('Importe').fill('130');
  await page.getByRole('button', { name: 'Agregar' }).click();
  await page.getByRole('button', { name: /Confirmar cobro/ }).click();

  await expect(page.getByText('Venta cobrada')).toBeVisible();

  // Existencias de la sucursal del cajero…
  expect(await leerStock(a, principal)).toBe('19.00');
  expect(await leerStock(b, principal)).toBe('17.00');
  expect(await leerStock(c, principal)).toBe('18.00');

  // …y la otra sucursal, intacta.
  expect(await leerStock(a, segunda)).toBe('20.00');
  expect(await leerStock(b, segunda)).toBe('20.00');
  expect(await leerStock(c, segunda)).toBe('20.00');
});

test('2 · pago mixto de $100 efectivo y $50 tarjeta para $130 guarda exactamente $130 y da $20 de cambio', async ({
  page,
}) => {
  await prepararProducto({
    code: 'E2E-130',
    nombre: 'Prueba 130',
    precio: '130.00',
    costo: '60.00',
    stock: '10.00',
  });

  await abrirTurnoDe('cajera', '500.00');
  await entrarComo(page, 'cajera');
  await page.goto('/caja');
  await agregarPorCodigo(page, 'E2E-130');

  await page.getByRole('button', { name: 'Cobrar (F12)' }).click();

  // $100 en efectivo…
  await page.getByRole('button', { name: 'Efectivo' }).click();
  await page.getByLabel('Importe').fill('100');
  await page.getByRole('button', { name: 'Agregar' }).click();

  // …y $50 con tarjeta.
  await page.getByRole('button', { name: 'Tarjeta' }).click();
  await page.getByLabel('Importe').fill('50');
  await page.getByRole('button', { name: 'Agregar' }).click();

  // El cambio se ve antes de confirmar.
  await expect(page.locator('[data-prueba="cambio"]')).toHaveText('$20.00');

  await page.getByRole('button', { name: /Confirmar cobro/ }).click();
  await expect(page.getByText('Venta cobrada')).toBeVisible();
  await expect(page.getByText('$20.00')).toBeVisible();

  const [venta] = await ventasRecientes(1);
  expect(venta!.total).toBe('130.00');
  expect(venta!.pagos).toHaveLength(2);

  // La suma de los pagos guardados es EXACTAMENTE el total: el cambio no es ingreso (§7.2).
  const suma = venta!.pagos.reduce((s, p) => s + Number(p.amount), 0);
  expect(suma).toBeCloseTo(130, 2);
  expect(venta!.pagos.map((p) => `${p.method}:${p.amount}`)).toEqual(['cash:100.00', 'card:30.00']);
});

test('3 · el pago insuficiente muestra el error y no guarda nada', async ({ page }) => {
  await prepararProducto({
    code: 'E2E-130',
    nombre: 'Prueba 130',
    precio: '130.00',
    costo: '60.00',
    stock: '10.00',
  });

  await abrirTurnoDe('cajera', '500.00');
  await entrarComo(page, 'cajera');
  await page.goto('/caja');
  await agregarPorCodigo(page, 'E2E-130');

  await page.getByRole('button', { name: 'Cobrar (F12)' }).click();
  await page.getByLabel('Importe').fill('50');
  await page.getByRole('button', { name: 'Agregar' }).click();

  // Con el pago corto, confirmar ni siquiera se ofrece.
  await expect(page.getByRole('button', { name: /Confirmar cobro/ })).toBeDisabled();
  await expect(page.locator('[data-prueba="cambio"]')).toHaveText('$80.00');

  expect(await ventasRecientes(1)).toHaveLength(0);
});

test('4 · dos cajas vendiendo el último: la segunda falla y el stock no queda negativo', async ({
  browser,
}) => {
  const principal = await sucursalPorNombre('Principal');
  const id = await prepararProducto({
    code: 'E2E-ULT',
    nombre: 'El último',
    precio: '25.00',
    costo: '10.00',
    stock: '1.00',
  });

  await abrirTurnoDe('cajera', '500.00');

  // Dos pestañas de la misma cajera, las dos con el último producto en el carrito.
  const contexto = await browser.newContext();
  const pestana1 = await contexto.newPage();
  const pestana2 = await contexto.newPage();

  await entrarComo(pestana1, 'cajera');
  await pestana1.goto('/caja');
  await pestana2.goto('/caja');

  await agregarPorCodigo(pestana1, 'E2E-ULT');
  await agregarPorCodigo(pestana2, 'E2E-ULT');

  // La primera cobra y se lleva la única pieza.
  await pestana1.getByRole('button', { name: 'Cobrar (F12)' }).click();
  await pestana1.getByLabel('Importe').fill('25');
  await pestana1.getByRole('button', { name: 'Agregar' }).click();
  await pestana1.getByRole('button', { name: /Confirmar cobro/ }).click();
  await expect(pestana1.getByText('Venta cobrada')).toBeVisible();

  // La segunda ya no tiene de dónde.
  await pestana2.getByRole('button', { name: 'Cobrar (F12)' }).click();
  await pestana2.getByLabel('Importe').fill('25');
  await pestana2.getByRole('button', { name: 'Agregar' }).click();
  await pestana2.getByRole('button', { name: /Confirmar cobro/ }).click();

  await expect(pestana2.getByText('Sin existencia suficiente de El último.')).toBeVisible();

  // Y lo que de verdad importa: el stock quedó en cero, nunca en −1.
  expect(await leerStock(id, principal)).toBe('0.00');
  expect(await ventasRecientes(5)).toHaveLength(1);

  await contexto.close();
});

test('5 · dos ventas seguidas generan folios consecutivos', async ({ page }) => {
  await prepararProducto({
    code: 'E2E-A',
    nombre: 'Prueba A',
    precio: '10.00',
    costo: '5.00',
    stock: '20.00',
  });

  await abrirTurnoDe('cajera', '500.00');
  await entrarComo(page, 'cajera');

  for (let i = 0; i < 2; i++) {
    await page.goto('/caja');
    await agregarPorCodigo(page, 'E2E-A');
    await page.getByRole('button', { name: 'Cobrar (F12)' }).click();
    await page.getByLabel('Importe').fill('10');
    await page.getByRole('button', { name: 'Agregar' }).click();
    await page.getByRole('button', { name: /Confirmar cobro/ }).click();
    await expect(page.getByText('Venta cobrada')).toBeVisible();
  }

  const ventas = await ventasRecientes(2);
  expect(ventas).toHaveLength(2);

  const folios = ventas.map((v) => v.ticket_number).sort();
  expect(new Set(folios).size).toBe(2); // sin repetirse

  // Formato de §7.3 y consecutivos: BR{sucursal}-{YYYYMMDD}-{0001}
  for (const folio of folios) expect(folio).toMatch(/^BR\d+-\d{8}-\d{4,}$/);
  const numeros = folios.map((f) => Number(f.split('-')[2]));
  expect(numeros[1]! - numeros[0]!).toBe(1);
});

test('6 · la venta se arma y se cobra sin tocar el mouse', async ({ page }) => {
  await prepararProducto({
    code: 'E2E-TEC',
    nombre: 'Sin mouse',
    precio: '45.00',
    costo: '20.00',
    stock: '10.00',
  });

  await abrirTurnoDe('cajera', '500.00');
  await entrarComo(page, 'cajera');
  await page.goto('/caja');

  // A partir de aquí, solo teclado: ni un clic.
  await page.keyboard.press('F2'); // al buscador
  await page.keyboard.type('E2E-TEC');
  await page.keyboard.press('Enter'); // agrega el primer resultado
  await page.keyboard.press('F12'); // abre el cobro

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab'); // hasta el importe
  await page.getByLabel('Importe').focus();
  await page.keyboard.type('50');
  await page.keyboard.press('Enter'); // registra el pago
  await page.keyboard.press('F12'); // confirma

  await expect(page.getByText('Venta cobrada')).toBeVisible();
  await expect(page.getByText('$5.00')).toBeVisible(); // cambio de $50 sobre $45

  const [venta] = await ventasRecientes(1);
  expect(venta!.total).toBe('45.00');
});

test('7 · el ticket sale a 80mm y se ve completo', async ({ page }) => {
  await prepararProducto({
    code: 'E2E-A',
    nombre: 'Prueba A',
    precio: '10.00',
    costo: '5.00',
    stock: '20.00',
  });

  await abrirTurnoDe('cajera', '500.00');
  await entrarComo(page, 'cajera');
  await page.goto('/caja');
  await agregarPorCodigo(page, 'E2E-A');
  await page.getByRole('button', { name: 'Cobrar (F12)' }).click();
  await page.getByLabel('Importe').fill('10');
  await page.getByRole('button', { name: 'Agregar' }).click();
  await page.getByRole('button', { name: /Confirmar cobro/ }).click();
  await expect(page.getByText('Venta cobrada')).toBeVisible();

  const [venta] = await ventasRecientes(1);
  const token = await tokenDeVenta(venta!.id);

  // El ticket se abre SIN sesión: es la mitad del criterio de §6, poder mandárselo al
  // cliente por WhatsApp.
  const anonimo = await page.context().browser()!.newContext();
  const pagina = await anonimo.newPage();
  const respuesta = await pagina.goto(`/ticket/${token}`);
  expect(respuesta?.status()).toBe(200);

  await expect(pagina.getByText(venta!.ticket_number)).toBeVisible();
  await expect(pagina.getByText('Prueba A')).toBeVisible();
  await expect(pagina.getByText('¡Gracias por su compra!')).toBeVisible();

  // La cinta mide 72mm de contenido + 4mm de margen a cada lado = 80mm exactos.
  const ancho = await pagina.locator('.cinta').evaluate((el) => el.getBoundingClientRect().width);
  const mmEnPx = 96 / 25.4;
  expect(ancho / mmEnPx).toBeCloseTo(80, 0);

  // Y nada se desborda de la cinta.
  const desborde = await pagina.locator('.cinta').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(desborde).toBeLessThanOrEqual(1);

  await anonimo.close();
});
