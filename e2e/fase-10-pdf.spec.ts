import { expect, test } from '@playwright/test';

import { archivoPdf } from './pdf';
import { conectar, entrarComo } from './ayudas';

// Herramientas de PDF (§ fuera de la spec original, como fase-9): "Unir", "Dividir",
// "Rotar", "Reordenar" y "Numerar", cada una en /herramientas/pdf/<id> (con sesión) y
// /imprimir/pdf/<id> (pública salvo que el admin la apague). El grupo "Herramientas de
// PDF" ya no es `proxima` (ver fix en fase-6-herramientas.spec.ts, prueba 3).
//
// El interruptor de "Disponible al público" (`tool_settings`) es PÚBLICA por defecto
// desde el 19 de agosto de 2026 (antes era al revés) — sin fila en la tabla, ya es
// pública. Cada prueba borra la fila antes y después, para arrancar siempre del estado
// por defecto real y no dejar sucia la base para otras corridas ni para producción
// (comparten la misma base — ver memoria del proyecto).

async function restablecerVisibilidad(id: string) {
  const sql = conectar();
  try {
    await sql`delete from tool_settings where id = ${id}`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const IDS_PDF = ['unir', 'dividir', 'rotar', 'reordenar', 'numerar'];

test.beforeEach(async () => {
  for (const id of IDS_PDF) await restablecerVisibilidad(id);
});

test.afterEach(async () => {
  for (const id of IDS_PDF) await restablecerVisibilidad(id);
});

test('1 · /herramientas/pdf lista "Unir PDF" y ya no está atenuada', async ({ page }) => {
  await entrarComo(page, 'cajera');
  const respuesta = await page.goto('/herramientas/pdf');
  expect(respuesta?.status()).toBe(200);

  const tarjeta = page.locator('li').filter({ hasText: 'Unir PDF' });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.locator('[aria-disabled="true"]')).toHaveCount(0);
  await expect(tarjeta.getByRole('link')).toHaveCount(1);
});

test('2 · unir dos PDF descarga uno solo con la suma de páginas', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/unir');

  await expect(page.getByRole('button', { name: 'Unir y descargar' })).toBeDisabled(); // sin archivos

  await page
    .locator('input[type="file"]')
    .setInputFiles([await archivoPdf('a.pdf', 2), await archivoPdf('b.pdf', 3)]);

  await expect(page.getByText('2 archivos, 5 páginas en total.')).toBeVisible();

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Unir y descargar' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^unido-\d+\.pdf$/);

  const ruta = await descarga.path();
  const { PDFDocument } = await import('pdf-lib');
  const fs = await import('node:fs/promises');
  const bytes = await fs.readFile(ruta!);
  const documento = await PDFDocument.load(bytes);
  expect(documento.getPageCount()).toBe(5);
});

test('3 · un solo archivo no se puede unir; quitarlo lo saca de la lista', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/unir');

  await page.locator('input[type="file"]').setInputFiles([await archivoPdf('a.pdf', 1)]);
  await expect(page.getByText('Agrega al menos otro PDF para poder unir.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unir y descargar' })).toBeDisabled();

  await page.getByRole('button', { name: 'Quitar a.pdf' }).click();
  await expect(page.getByText('a.pdf')).toHaveCount(0);
});

test('4 · un archivo que no es PDF de verdad avisa, sin tronar', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/unir');

  const erroresDeConsola: string[] = [];
  page.on('pageerror', (error) => erroresDeConsola.push(error.message));

  await page.locator('input[type="file"]').setInputFiles({
    name: 'no-es-pdf.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('esto no es un PDF'),
  });

  await expect(page.getByText(/no es un PDF válido/)).toBeVisible();
  expect(erroresDeConsola).toEqual([]);
});

test('5 · el interruptor público controla /imprimir/pdf/unir y los dos índices, de punta a punta', async ({
  page,
  context,
}) => {
  // Pública por defecto: sin fila en tool_settings, ya responde.
  const publica1 = await context.newPage();
  await publica1.goto('/imprimir/pdf/unir');
  await expect(publica1.getByText('Agregar PDF')).toBeVisible();
  await publica1.close();

  await entrarComo(page, 'admin');
  await page.goto('/herramientas/pdf/unir');
  const interruptor = page.getByRole('checkbox', { name: /Disponible al público/ });
  await expect(interruptor).toBeChecked();

  // Se apaga: bloquea la URL pública y desaparece de los índices.
  await interruptor.uncheck();
  // El checkbox se marca al toque (optimista), pero el server action + revalidatePath
  // siguen en vuelo: hay que esperar a que la transición termine (vuelve a habilitarse)
  // antes de asumir que la base y la caché ya reflejan el cambio.
  await expect(interruptor).toBeEnabled();

  const publica2 = await context.newPage();
  await publica2.goto('/imprimir/pdf/unir');
  await expect(publica2.getByText('no está disponible')).toBeVisible();
  await publica2.close();

  const indice = await context.newPage();
  await indice.goto('/imprimir/pdf');
  await expect(indice.getByRole('link', { name: /Unir PDF/i })).toHaveCount(0);
  await indice.close();

  // Se prende otra vez: vuelve a responder y reaparece en los índices.
  await interruptor.check();
  await expect(interruptor).toBeEnabled();
  const publica3 = await context.newPage();
  await publica3.goto('/imprimir/pdf/unir');
  await expect(publica3.getByText('Agregar PDF')).toBeVisible();
  await publica3.goto('/imprimir');
  await expect(publica3.getByRole('link', { name: /Herramientas de PDF/i })).toBeVisible();
  await publica3.close();
});

test('6 · /herramientas/pdf lista "Dividir PDF" y ya no está atenuada', async ({ page }) => {
  await entrarComo(page, 'cajera');
  const respuesta = await page.goto('/herramientas/pdf');
  expect(respuesta?.status()).toBe(200);

  const tarjeta = page.locator('li').filter({ hasText: 'Dividir PDF' });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.locator('[aria-disabled="true"]')).toHaveCount(0);
  await expect(tarjeta.getByRole('link')).toHaveCount(1);
});

test('7 · dividir por rangos produce un archivo por rango, con las páginas correctas', async ({
  page,
}) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/dividir');

  await expect(page.getByRole('button', { name: 'Dividir y descargar' })).toBeDisabled();

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 5));
  await expect(page.getByText('reporte.pdf')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dividir y descargar' })).toBeDisabled(); // sin rangos aún

  await page.getByLabel('Rangos de páginas').fill('1-2, 3-5');

  const descargas: import('@playwright/test').Download[] = [];
  page.on('download', (d) => descargas.push(d));
  await page.getByRole('button', { name: 'Dividir y descargar' }).click();
  await expect.poll(() => descargas.length).toBe(2);

  const { PDFDocument } = await import('pdf-lib');
  const fs = await import('node:fs/promises');
  const esperadoPorNombre: Record<string, number> = {
    'reporte-parte-1.pdf': 2,
    'reporte-parte-2.pdf': 3,
  };
  for (const descarga of descargas) {
    const bytes = await fs.readFile((await descarga.path())!);
    const documento = await PDFDocument.load(bytes);
    expect(documento.getPageCount()).toBe(esperadoPorNombre[descarga.suggestedFilename()]);
  }
});

test('8 · "Una página por archivo" arma el rango automáticamente', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/dividir');

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 4));
  await page.getByRole('button', { name: 'Una página por archivo' }).click();
  await expect(page.getByLabel('Rangos de páginas')).toHaveValue('1, 2, 3, 4');
});

test('9 · un rango fuera de las páginas del PDF avisa, sin tronar', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/dividir');

  const erroresDeConsola: string[] = [];
  page.on('pageerror', (error) => erroresDeConsola.push(error.message));

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 3));
  await page.getByLabel('Rangos de páginas').fill('1-9');
  await page.getByRole('button', { name: 'Dividir y descargar' }).click();

  await expect(page.getByText(/solo tiene 3 páginas/)).toBeVisible();
  expect(erroresDeConsola).toEqual([]);
});

test('10 · el interruptor público controla /imprimir/pdf/dividir', async ({ page, context }) => {
  const publica1 = await context.newPage();
  await publica1.goto('/imprimir/pdf/dividir');
  await expect(publica1.getByText('Agregar PDF')).toBeVisible();
  await publica1.close();

  await entrarComo(page, 'admin');
  await page.goto('/herramientas/pdf/dividir');
  const interruptor = page.getByRole('checkbox', { name: /Disponible al público/ });
  await expect(interruptor).toBeChecked();
  await interruptor.uncheck();
  await expect(interruptor).toBeEnabled();

  const publica2 = await context.newPage();
  await publica2.goto('/imprimir/pdf/dividir');
  await expect(publica2.getByText('no está disponible')).toBeVisible();
  await publica2.close();

  await interruptor.check();
  await expect(interruptor).toBeEnabled();
});

test('11 · girar todas las páginas, y solo un rango, dan la rotación correcta', async ({
  page,
}) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/rotar');

  await expect(page.getByRole('button', { name: 'Girar y descargar' })).toBeDisabled();

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 3));
  await page.getByRole('button', { name: 'Derecha ↻' }).click();
  await expect(page.getByText('Se va a girar 90° a la derecha')).toBeVisible();

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Girar y descargar' }).click(),
  ]);

  const { PDFDocument } = await import('pdf-lib');
  const fs = await import('node:fs/promises');
  const documento = await PDFDocument.load(await fs.readFile((await descarga.path())!));
  expect(documento.getPages().map((p) => p.getRotation().angle)).toEqual([90, 90, 90]);
});

test('12 · girar dos veces a la derecha acumula 180°, no reemplaza', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/rotar');

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 1));
  await page.getByRole('button', { name: 'Derecha ↻' }).click();
  await page.getByRole('button', { name: 'Derecha ↻' }).click();
  await expect(page.getByText('Se va a girar 180°')).toBeVisible();
});

test('13 · rotar solo un rango deja las demás páginas sin girar', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/rotar');

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 3));
  await page.getByRole('button', { name: '180°' }).click();
  await page.getByLabel('Páginas (opcional)').fill('2');

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Girar y descargar' }).click(),
  ]);

  const { PDFDocument } = await import('pdf-lib');
  const fs = await import('node:fs/promises');
  const documento = await PDFDocument.load(await fs.readFile((await descarga.path())!));
  expect(documento.getPages().map((p) => p.getRotation().angle)).toEqual([0, 180, 0]);
});

test('14 · el interruptor público controla /imprimir/pdf/rotar', async ({ page, context }) => {
  const publica1 = await context.newPage();
  await publica1.goto('/imprimir/pdf/rotar');
  await expect(publica1.getByText('Agregar PDF')).toBeVisible();
  await publica1.close();

  await entrarComo(page, 'admin');
  await page.goto('/herramientas/pdf/rotar');
  const interruptor = page.getByRole('checkbox', { name: /Disponible al público/ });
  await expect(interruptor).toBeChecked();
  await interruptor.uncheck();
  await expect(interruptor).toBeEnabled();

  const publica2 = await context.newPage();
  await publica2.goto('/imprimir/pdf/rotar');
  await expect(publica2.getByText('no está disponible')).toBeVisible();
  await publica2.close();

  await interruptor.check();
  await expect(interruptor).toBeEnabled();
});

test('15 · reordenar cambia el orden real de las páginas, e "Invertir orden" lo arma solo', async ({
  page,
}) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/reordenar');

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 3));
  await expect(page.getByLabel('Orden de páginas')).toHaveValue('1, 2, 3');

  await page.getByRole('button', { name: 'Invertir orden' }).click();
  await expect(page.getByLabel('Orden de páginas')).toHaveValue('3, 2, 1');

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Reordenar y descargar' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toBe('reporte-reordenado.pdf');
});

test('16 · un orden con páginas repetidas o faltantes avisa, sin tronar', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/reordenar');

  const erroresDeConsola: string[] = [];
  page.on('pageerror', (error) => erroresDeConsola.push(error.message));

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 3));
  await page.getByLabel('Orden de páginas').fill('1, 1, 2');
  await page.getByRole('button', { name: 'Reordenar y descargar' }).click();

  await expect(page.getByText(/una sola vez/)).toBeVisible();
  expect(erroresDeConsola).toEqual([]);
});

test('17 · el interruptor público controla /imprimir/pdf/reordenar', async ({ page, context }) => {
  const publica1 = await context.newPage();
  await publica1.goto('/imprimir/pdf/reordenar');
  await expect(publica1.getByText('Agregar PDF')).toBeVisible();
  await publica1.close();

  await entrarComo(page, 'admin');
  await page.goto('/herramientas/pdf/reordenar');
  const interruptor = page.getByRole('checkbox', { name: /Disponible al público/ });
  await expect(interruptor).toBeChecked();
  await interruptor.uncheck();
  await expect(interruptor).toBeEnabled();

  const publica2 = await context.newPage();
  await publica2.goto('/imprimir/pdf/reordenar');
  await expect(publica2.getByText('no está disponible')).toBeVisible();
  await publica2.close();

  await interruptor.check();
  await expect(interruptor).toBeEnabled();
});

test('18 · numerar arranca en 1 por defecto y respeta un número inicial distinto', async ({
  page,
}) => {
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas/pdf/numerar');

  await expect(page.getByRole('button', { name: 'Numerar y descargar' })).toBeDisabled();

  await page.locator('input[type="file"]').setInputFiles(await archivoPdf('reporte.pdf', 3));
  await page.getByLabel('Empezar en').fill('10');
  await expect(page.getByText('La última hoja quedará con el 12.')).toBeVisible();

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Numerar y descargar' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toBe('reporte-numerado.pdf');
});

test('19 · el interruptor público controla /imprimir/pdf/numerar', async ({ page, context }) => {
  const publica1 = await context.newPage();
  await publica1.goto('/imprimir/pdf/numerar');
  await expect(publica1.getByText('Agregar PDF')).toBeVisible();
  await publica1.close();

  await entrarComo(page, 'admin');
  await page.goto('/herramientas/pdf/numerar');
  const interruptor = page.getByRole('checkbox', { name: /Disponible al público/ });
  await expect(interruptor).toBeChecked();
  await interruptor.uncheck();
  await expect(interruptor).toBeEnabled();

  const publica2 = await context.newPage();
  await publica2.goto('/imprimir/pdf/numerar');
  await expect(publica2.getByText('no está disponible')).toBeVisible();
  await publica2.close();

  await interruptor.check();
  await expect(interruptor).toBeEnabled();
});
