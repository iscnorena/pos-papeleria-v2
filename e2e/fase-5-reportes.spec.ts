import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

import {
  abrirTurnoDe,
  entrarComo,
  leerStock,
  limpiarRastrosE2E,
  limpiarTurnos,
  prepararProducto,
  sucursalPorNombre,
  ventaFabricada,
} from './ayudas';

// Los 4 criterios de aceptación de la Fase 5.

/** Vende un producto por la caja y devuelve el folio. */
async function venderPorLaCaja(page: Page, codigo: string, importe: string) {
  await page.goto('/caja');
  const buscador = page.getByLabel('Buscar producto');
  await buscador.fill(codigo);
  await buscador.press('Enter');
  await page.getByRole('button', { name: 'Cobrar (F12)' }).click();
  await page.getByLabel('Importe').fill(importe);
  await page.getByRole('button', { name: 'Agregar' }).click();
  await page.getByRole('button', { name: /Confirmar cobro/ }).click();
  await expect(page.getByText('Venta cobrada')).toBeVisible();
}

/** El texto de una cifra del panel de resumen, buscada por su etiqueta. */
function cifra(page: Page, etiqueta: string) {
  return page.locator(`div:has(> dt:text-is("${etiqueta}")) > dd`);
}

test.beforeEach(async () => {
  await limpiarTurnos();
  await limpiarRastrosE2E();
});

test.afterAll(async () => {
  await limpiarTurnos();
  await limpiarRastrosE2E();
});

test('1 · el reporte diario cuadra con el historial del mismo día', async ({ page }) => {
  await prepararProducto({
    code: 'E2E-R',
    nombre: 'Reporte A',
    precio: '40.00',
    costo: '15.00',
    stock: '30.00',
  });

  await abrirTurnoDe('admin', '500.00');
  await entrarComo(page, 'admin');

  await venderPorLaCaja(page, 'E2E-R', '40');
  await venderPorLaCaja(page, 'E2E-R', '40');
  await venderPorLaCaja(page, 'E2E-R', '40');

  // Lo que dice el historial…
  await page.goto('/historial');
  const ingresoHistorial = await cifra(page, 'Ingreso').textContent();
  const ventasHistorial = await cifra(page, 'Ventas').textContent();

  // …y lo que dice el reporte del mismo día.
  await page.goto('/reportes');
  const ingresoReporte = await cifra(page, 'Ingreso').textContent();
  const ventasReporte = await cifra(page, 'Ventas').textContent();

  expect(ingresoReporte).toBe(ingresoHistorial);
  expect(ventasReporte).toBe(ventasHistorial);
  expect(ingresoReporte).toBe('$120.00');
  expect(ventasReporte).toBe('3');
});

test('2 · cancelar devuelve el stock, sale de los totales y queda tachada', async ({ page }) => {
  const principal = await sucursalPorNombre('Principal');
  const id = await prepararProducto({
    code: 'E2E-CAN',
    nombre: 'Para cancelar',
    precio: '40.00',
    costo: '15.00',
    stock: '10.00',
  });

  await abrirTurnoDe('admin', '500.00');
  await entrarComo(page, 'admin');

  await venderPorLaCaja(page, 'E2E-CAN', '40');
  expect(await leerStock(id, principal)).toBe('9.00');

  await page.goto('/reportes');
  expect(await cifra(page, 'Ingreso').textContent()).toBe('$40.00');

  // Se cancela desde el detalle.
  await page.goto('/historial');
  await page.getByRole('link', { name: 'Ver' }).first().click();
  await page.getByRole('button', { name: 'Cancelar venta' }).click();
  await page.getByRole('button', { name: 'Sí, cancelar' }).click();
  await expect(page.getByText('Esta venta está cancelada.')).toBeVisible();

  // El stock vuelve…
  expect(await leerStock(id, principal)).toBe('10.00');

  // …sale de los totales del reporte…
  await page.goto('/reportes');
  expect(await cifra(page, 'Ingreso').textContent()).toBe('$0.00');
  expect(await cifra(page, 'Canceladas').textContent()).toBe('1');

  // …y en el historial sigue ahí, tachada. Nada se borró (§10).
  await page.goto('/historial');
  const fila = page.locator('tbody tr').first();
  await expect(fila.getByText('Cancelada')).toBeVisible();
  await expect(fila.locator('.line-through').first()).toBeVisible();
});

test('3 · una venta de las 8 de la noche cuenta en su día natural, no en UTC', async ({ page }) => {
  const producto = await prepararProducto({
    code: 'E2E-NOC',
    nombre: 'Venta nocturna',
    precio: '99.00',
    costo: '10.00',
    stock: '10.00',
  });
  const turno = await abrirTurnoDe('admin', '500.00');

  // 2026-08-13, 20:30 en la Ciudad de México = 2026-08-14T02:30Z. Para el servidor, que
  // corre en UTC, ya es día 14; para el negocio, sigue siendo el 13.
  await ventaFabricada({
    username: 'admin',
    shiftId: turno,
    productId: producto,
    cuando: new Date('2026-08-14T02:30:00Z'),
    total: '99.00',
    folio: 'E2E-NOCTURNA-1',
  });

  await entrarComo(page, 'admin');

  // El día 13 la incluye…
  await page.goto('/reportes?desde=2026-08-13&hasta=2026-08-13');
  expect(await cifra(page, 'Ingreso').textContent()).toBe('$99.00');

  // …y el 14 no.
  await page.goto('/reportes?desde=2026-08-14&hasta=2026-08-14');
  expect(await cifra(page, 'Ingreso').textContent()).toBe('$0.00');
});

test('4 · el CSV lleva BOM UTF-8 y los acentos llegan intactos', async ({ page }) => {
  const producto = await prepararProducto({
    code: 'E2E-CSV',
    nombre: 'Para el CSV',
    precio: '25.00',
    costo: '10.00',
    stock: '10.00',
  });
  const turno = await abrirTurnoDe('maria', '500.00');

  // La venta la hace María: su nombre lleva acento, que es lo que se quiere comprobar.
  await ventaFabricada({
    username: 'maria',
    shiftId: turno,
    productId: producto,
    cuando: new Date(),
    total: '25.00',
    folio: 'E2E-CSV-1',
  });

  await entrarComo(page, 'admin');
  await page.goto('/reportes');

  const descarga = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ]).then(([d]) => d);

  const ruta = await descarga.path();
  const crudo = readFileSync(ruta);

  // El BOM UTF-8 son estos tres bytes. Sin ellos, Excel en Windows lee el archivo como
  // ANSI y «María» sale «MarÃ­a».
  expect([crudo[0], crudo[1], crudo[2]]).toEqual([0xef, 0xbb, 0xbf]);

  const texto = crudo.toString('utf8');
  expect(texto).toContain('María');
  expect(texto).toContain('Método de pago');
  expect(texto).toContain('Sección;Concepto;Importe');
  // Punto y coma como separador: es lo que espera el Excel en español.
  expect(texto.split('\r\n')[0]).toBe('﻿Sección;Concepto;Importe');
  expect(descarga.suggestedFilename()).toMatch(
    /^reporte-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.csv$/,
  );
});
