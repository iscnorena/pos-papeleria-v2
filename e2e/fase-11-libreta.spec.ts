import { expect, test } from '@playwright/test';

import { conectar, entrarComo } from './ayudas';

// Hoja de libreta (§ fuera de la spec original, como fase-9/10): genera un PDF con
// rayado/cuadrícula y datos opcionales del alumno, en /herramientas/libreta (con
// sesión) y /imprimir/libreta (pública salvo que el admin la apague). Todo ocurre en el
// navegador con pdf-lib + fontkit, sin rutas API propias.
//
// El interruptor de "Disponible al público" es público por defecto (ver
// fase-10-pdf.spec.ts): sin fila en `tool_settings`, ya responde. Se restablece antes y
// después de cada prueba para no dejar sucia la base compartida con producción.

async function restablecerVisibilidad() {
  const sql = conectar();
  try {
    await sql`delete from tool_settings where id = 'libreta'`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

test.beforeEach(restablecerVisibilidad);
test.afterEach(restablecerVisibilidad);

test('1 · /herramientas/libreta responde para admin y cajera con sesión', async ({ page }) => {
  await entrarComo(page, 'cajera');
  const respuesta = await page.goto('/herramientas/libreta');
  expect(respuesta?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Hoja de libreta' })).toBeVisible();
});

test('2 · /imprimir/libreta responde sin sesión, sin redirigir a /login', async ({ page }) => {
  const respuesta = await page.goto('/imprimir/libreta');
  expect(respuesta?.status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Generar y descargar' })).toBeVisible();
});

test('3 · el índice /imprimir enlaza a /imprimir/libreta', async ({ page }) => {
  await page.goto('/imprimir');
  await expect(page.getByRole('link', { name: /Hoja de libreta/i })).toHaveAttribute(
    'href',
    '/imprimir/libreta',
  );
});

test('4 · sin ningún dato del alumno, la hoja sale sin encabezado (1 página)', async ({ page }) => {
  await page.goto('/imprimir/libreta');

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generar y descargar' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^libreta-\d+\.pdf$/);

  const ruta = await descarga.path();
  const { PDFDocument } = await import('pdf-lib');
  const fs = await import('node:fs/promises');
  const bytes = await fs.readFile(ruta!);
  const documento = await PDFDocument.load(bytes);
  expect(documento.getPageCount()).toBe(1);
});

test('5 · cada estilo de rayado genera un PDF válido, de una sola página', async ({ page }) => {
  await page.goto('/imprimir/libreta');
  await page.getByLabel('Nombre del alumno').fill('Ana García');

  for (const estilo of ['raya', 'doble-raya', 'cuadro-c7', 'cuadro-aleman', 'dibujo']) {
    await page.getByLabel('Estilo').selectOption(estilo);
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Generar y descargar' }).click(),
    ]);
    const ruta = await descarga.path();
    const { PDFDocument } = await import('pdf-lib');
    const fs = await import('node:fs/promises');
    const bytes = await fs.readFile(ruta!);
    const documento = await PDFDocument.load(bytes);
    expect(documento.getPageCount()).toBe(1);
  }
});

test('6 · la cantidad repite la misma hoja y numerar páginas solo aparece si hay más de una', async ({
  page,
}) => {
  await page.goto('/imprimir/libreta');

  await expect(page.getByLabel('Numerar páginas')).toHaveCount(0);

  await page.getByLabel('¿Cuántas hojas?').fill('3');
  await expect(page.getByLabel('Numerar páginas')).toBeVisible();
  await page.getByLabel('Numerar páginas').check();

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generar y descargar' }).click(),
  ]);
  const ruta = await descarga.path();
  const { PDFDocument } = await import('pdf-lib');
  const fs = await import('node:fs/promises');
  const bytes = await fs.readFile(ruta!);
  const documento = await PDFDocument.load(bytes);
  expect(documento.getPageCount()).toBe(3);
});

test('7 · una cantidad fuera de rango muestra el aviso y no descarga nada', async ({ page }) => {
  await page.goto('/imprimir/libreta');

  await page.getByLabel('¿Cuántas hojas?').fill('999999');

  let huboDescarga = false;
  page.once('download', () => {
    huboDescarga = true;
  });
  await page.getByRole('button', { name: 'Generar y descargar' }).click();
  await expect(page.getByText(/La cantidad de hojas debe estar entre/)).toBeVisible();
  expect(huboDescarga).toBe(false);
});

test('8 · un nombre con emoji genera el PDF sin tronar', async ({ page }) => {
  const erroresDeConsola: string[] = [];
  page.on('pageerror', (error) => erroresDeConsola.push(error.message));

  await page.goto('/imprimir/libreta');
  await page.getByLabel('Nombre del alumno').fill('🎉 Ana 🎁');

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generar y descargar' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^libreta-\d+\.pdf$/);
  expect(erroresDeConsola).toEqual([]);
});

test('9 · "Enviar por WhatsApp" en /imprimir/libreta descarga el PDF y abre el chat correcto', async ({
  page,
}) => {
  await page.goto('/imprimir/libreta');
  await expect(page.getByRole('button', { name: 'Enviar por WhatsApp' })).toBeVisible();

  const [descarga, ventanaNueva] = await Promise.all([
    page.waitForEvent('download'),
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: 'Enviar por WhatsApp' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^libreta-\d+\.pdf$/);
  expect(ventanaNueva.url()).toContain('527445008175');
});

test('10 · la herramienta interna no muestra "Enviar por WhatsApp"', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/libreta');
  await expect(page.getByRole('button', { name: 'Generar y descargar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar por WhatsApp' })).toHaveCount(0);
});

test('11 · el interruptor público controla /imprimir/libreta', async ({ page, context }) => {
  const publica1 = await context.newPage();
  await publica1.goto('/imprimir/libreta');
  await expect(publica1.getByLabel('Nombre del alumno')).toBeVisible();
  await publica1.close();

  await entrarComo(page, 'admin');
  await page.goto('/herramientas/libreta');
  const interruptor = page.getByRole('checkbox', { name: /Disponible al público/ });
  await expect(interruptor).toBeChecked();
  await interruptor.uncheck();
  await expect(interruptor).toBeEnabled();

  const publica2 = await context.newPage();
  await publica2.goto('/imprimir/libreta');
  await expect(publica2.getByText('no está disponible')).toBeVisible();
  await publica2.close();

  await interruptor.check();
  await expect(interruptor).toBeEnabled();
});
