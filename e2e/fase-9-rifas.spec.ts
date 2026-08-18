import { expect, test } from '@playwright/test';

import { entrarComo } from './ayudas';
import { archivoPng } from './png';

// Números de rifa (§ fuera de la spec original, como fase-8): la MISMA herramienta en
// /herramientas/rifas (con sesión) y /imprimir/rifas (sin sesión, colgando del índice
// público). A diferencia de Acomoda Impresión, no hay WhatsApp ni rutas API: todo ocurre
// en el navegador con pdf-lib + fontkit.

test('1 · /herramientas/rifas responde para admin y cajera con sesión', async ({ page }) => {
  await entrarComo(page, 'cajera');
  const respuesta = await page.goto('/herramientas/rifas');
  expect(respuesta?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Números de rifa' })).toBeVisible();
});

test('2 · /imprimir/rifas responde sin sesión, sin redirigir a /login', async ({ page }) => {
  await page.context().clearCookies();
  const respuesta = await page.goto('/imprimir/rifas');
  expect(respuesta?.status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();
});

test('3 · el índice /imprimir enlaza a /imprimir/rifas', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/imprimir');
  await expect(page.getByRole('link', { name: /Números de rifa/i })).toHaveAttribute(
    'href',
    '/imprimir/rifas',
  );
});

test('4 · cambiar la cantidad o los boletos por página recalcula las páginas', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/imprimir/rifas');

  await page.getByLabel('Cantidad de boletos').fill('18');
  await expect(page.getByText('Salen 1 página, de 18 boletos cada una.')).toBeVisible();

  await page.getByLabel('Cantidad de boletos').fill('19');
  await expect(page.getByText('Salen 2 páginas, de 18 boletos cada una.')).toBeVisible();

  await page.getByLabel('Boletos por página').fill('10');
  await expect(page.getByText('Salen 2 páginas, de 10 boletos cada una.')).toBeVisible();
});

test('4b · pedir más de 18 por página se acota a 18 y avisa', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/imprimir/rifas');

  await page.getByLabel('Boletos por página').fill('40');
  await expect(page.getByLabel('Boletos por página')).toHaveValue('18');
  await expect(page.getByText(/El máximo son 18 boletos por página/)).toBeVisible();
});

test('5 · "Descargar PDF" dispara una descarga con el nombre esperado', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/imprimir/rifas');

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar PDF' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^rifa-\d+\.pdf$/);
});

test('6 · una cantidad fuera de rango muestra el aviso y no descarga nada', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/imprimir/rifas');

  await page.getByLabel('Cantidad de boletos').fill('999999');

  let huboDescarga = false;
  page.once('download', () => {
    huboDescarga = true;
  });
  await page.getByRole('button', { name: 'Descargar PDF' }).click();
  await expect(page.getByText(/La cantidad de boletos debe estar entre/)).toBeVisible();
  expect(huboDescarga).toBe(false);
});

test('7b · la foto del premio es opcional: se puede generar sin ella y con ella', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/imprimir/rifas');

  // Sin foto: descarga igual (es opcional).
  const [sinFoto] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar PDF' }).click(),
  ]);
  expect(sinFoto.suggestedFilename()).toMatch(/^rifa-\d+\.pdf$/);

  // Con foto: sigue funcionando y el botón cambia de texto.
  await page.getByLabel('Premio').fill('Una tele');
  await page.getByLabel('Foto (opcional)').setInputFiles(archivoPng('premio.png', 40, 40));
  await expect(page.getByText('Cambiar foto')).toBeVisible();

  const [conFoto] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar PDF' }).click(),
  ]);
  expect(conFoto.suggestedFilename()).toMatch(/^rifa-\d+\.pdf$/);
});

test('7 · un nombre de evento con emoji genera el PDF sin tronar', async ({ page }) => {
  await page.context().clearCookies();
  const erroresDeConsola: string[] = [];
  page.on('pageerror', (error) => erroresDeConsola.push(error.message));

  await page.goto('/imprimir/rifas');
  await page.getByLabel('Nombre del evento').fill('🎉 Rifa Navideña 🎁');

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar PDF' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^rifa-\d+\.pdf$/);
  expect(erroresDeConsola).toEqual([]);
});
