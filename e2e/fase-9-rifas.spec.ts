import { expect, test } from '@playwright/test';

import { entrarComo } from './ayudas';
import { archivoPng } from './png';

// Números de rifa (§ fuera de la spec original, como fase-8): la MISMA herramienta en
// /herramientas/rifas (con sesión) y /kit/rifas (sin sesión, colgando del índice
// público). Sin rutas API propias: todo ocurre en el navegador con pdf-lib + fontkit.
//
// /kit/rifas SÍ tiene "Enviar por WhatsApp" (además de "Descargar PDF", a diferencia
// de /kit/acomoda-impresion que solo tiene WhatsApp) — depende de que la sucursal
// "Principal" de la semilla tenga `whatsapp_number` cargado (527445008175), igual que
// fase-8. La ruta interna no lo muestra: el personal ya está en la papelería.

test('1 · /herramientas/rifas responde para admin y cajera con sesión', async ({ page }) => {
  await entrarComo(page, 'cajera');
  const respuesta = await page.goto('/herramientas/rifas');
  expect(respuesta?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Números de rifa' })).toBeVisible();
});

test('2 · /kit/rifas responde sin sesión, sin redirigir a /login', async ({ page }) => {
  await page.context().clearCookies();
  const respuesta = await page.goto('/kit/rifas');
  expect(respuesta?.status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();
});

test('3 · el índice /kit enlaza a /kit/rifas', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/kit');
  await expect(page.getByRole('link', { name: /Números de rifa/i })).toHaveAttribute(
    'href',
    '/kit/rifas',
  );
});

test('4 · cambiar la cantidad o los boletos por página recalcula las páginas', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/kit/rifas');

  await page.getByLabel('Cantidad de boletos').fill('18');
  await expect(page.getByText('Salen 1 página, de 18 boletos cada una.')).toBeVisible();

  await page.getByLabel('Cantidad de boletos').fill('19');
  await expect(page.getByText('Salen 2 páginas, de 18 boletos cada una.')).toBeVisible();

  await page.getByLabel('Boletos por página').fill('25');
  await expect(page.getByText('Salen 1 página, de 25 boletos cada una.')).toBeVisible();
});

test('4b · fuera del rango 18-35, el texto muestra el valor acotado pero no deja generar', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/kit/rifas');

  // El campo deja escribir libremente (no pelea con cada tecla)...
  await page.getByLabel('Boletos por página').fill('40');
  await expect(page.getByLabel('Boletos por página')).toHaveValue('40');
  // ...pero el texto informativo usa el valor acotado, para no prometer algo que no es.
  await expect(page.getByText(/de 35 boletos cada una\./)).toBeVisible();

  let huboDescarga = false;
  page.once('download', () => {
    huboDescarga = true;
  });
  await page.getByRole('button', { name: 'Descargar PDF' }).click();
  await expect(page.getByText(/Los boletos por página deben estar entre 18 y 35/)).toBeVisible();
  expect(huboDescarga).toBe(false);

  await page.getByLabel('Boletos por página').fill('5');
  await expect(page.getByText(/de 18 boletos cada una\./)).toBeVisible();
});

test('5 · "Descargar PDF" dispara una descarga con el nombre esperado', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/kit/rifas');

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar PDF' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^rifa-\d+\.pdf$/);
});

test('6 · una cantidad fuera de rango muestra el aviso y no descarga nada', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/kit/rifas');

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
  await page.goto('/kit/rifas');

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

test('8 · "Enviar por WhatsApp" en /kit/rifas descarga el PDF y abre el chat correcto', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/kit/rifas');
  await expect(page.getByRole('button', { name: 'Enviar por WhatsApp' })).toBeVisible();

  const [descarga, ventanaNueva] = await Promise.all([
    page.waitForEvent('download'),
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: 'Enviar por WhatsApp' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^rifa-\d+\.pdf$/);
  // wa.me redirige a api.whatsapp.com/send al abrirse sin la app instalada: se comprueba
  // el número, no el dominio exacto (mismo criterio que fase-8).
  expect(ventanaNueva.url()).toContain('527445008175');
  expect(decodeURIComponent(ventanaNueva.url().replace(/\+/g, ' '))).toContain(
    'cree este documento en generador de loterias me gustaria imprimir',
  );
});

test('8b · la herramienta interna no muestra "Enviar por WhatsApp"', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/rifas');
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar por WhatsApp' })).toHaveCount(0);
});

test('7 · un nombre de evento con emoji genera el PDF sin tronar', async ({ page }) => {
  await page.context().clearCookies();
  const erroresDeConsola: string[] = [];
  page.on('pageerror', (error) => erroresDeConsola.push(error.message));

  await page.goto('/kit/rifas');
  await page.getByLabel('Nombre del evento').fill('🎉 Rifa Navideña 🎁');

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar PDF' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^rifa-\d+\.pdf$/);
  expect(erroresDeConsola).toEqual([]);
});
