import { expect, test, type Page } from '@playwright/test';

import { entrarComo } from './ayudas';
import { archivoPng } from './png';

// §7.8 — los 12 criterios, verificados hasta donde llega el navegador.
//
// Tres no se pueden automatizar del todo y quedan anotados para revisar a mano:
//   · el 5 pide medir la hoja IMPRESA con regla; aquí se comprueba que el rectángulo mide
//     exactamente los píxeles que corresponden a 5cm, que es la mitad verificable.
//   · el 9 necesita llaves de API de verdad; se prueba su contrario, el 10.
//   · el 11 pide comparar el PDF con la vista previa a ojo; aquí se comprueba que el PDF
//     sale, es válido y tiene el número de páginas que dice la vista previa.

const RUTA = '/herramientas/acomoda-impresion';

/** Sube N imágenes al lote. Apaisadas 2:1, para que la proporción se note. */
async function subir(page: Page, cuantas: number) {
  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles(
      Array.from({ length: cuantas }, (_, i) => archivoPng(`prueba-${i}.png`, 200, 100)),
    );
  await expect(page.locator('[data-prueba="miniatura"]')).toHaveCount(cuantas);
}

async function elegirLayout(page: Page, etiqueta: string) {
  await page.getByLabel('Layout').selectOption({ label: etiqueta });
}

test.beforeEach(async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto(RUTA);
});

test('1 · 5 imágenes en 2×2 dan dos páginas, la segunda con 3 celdas grises', async ({ page }) => {
  await subir(page, 5);
  await elegirLayout(page, '4 (2×2)');

  await expect(page.locator('[data-prueba="paginacion"]')).toHaveText('Página 1 de 2');

  // La primera hoja va llena: 4 imágenes y ninguna celda vacía.
  const hoja = page.locator('[aria-label^="Hoja"]');
  await expect(hoja.locator('img')).toHaveCount(4);

  await page.getByRole('button', { name: 'Siguiente ▶' }).click();
  await expect(page.locator('[data-prueba="paginacion"]')).toHaveText('Página 2 de 2');

  // La segunda, una imagen y tres celdas grises.
  await expect(hoja.locator('img')).toHaveCount(1);
  const grises = hoja.locator('div[style*="rgb(245, 245, 245)"]');
  await expect(grises).toHaveCount(3);
});

test('2 · pasar a 3×3 deja una página y baja el total de $15.00 a $5.00', async ({ page }) => {
  await subir(page, 5);

  await elegirLayout(page, '4 (2×2)');
  await expect(page.locator('[data-prueba="paginacion"]')).toHaveText('Página 1 de 2');
  await expect(page.locator('[data-prueba="total"]')).toHaveText('$15.00');

  await elegirLayout(page, '9 (3×3)');
  await expect(page.locator('[data-prueba="paginacion"]')).toHaveText('Página 1 de 1');
  await expect(page.locator('[data-prueba="total"]')).toHaveText('$5.00');
});

test('3 · en blanco y negro, 5 imágenes en 3×3 cuestan $1.00', async ({ page }) => {
  await subir(page, 5);
  await elegirLayout(page, '9 (3×3)');

  await page.getByRole('button', { name: 'Blanco y negro' }).click();
  await expect(page.locator('[data-prueba="total"]')).toHaveText('$1.00');
});

test('4 · maximizar llena la celda; al apagarlo, la imagen se centra con su proporción', async ({
  page,
}) => {
  await subir(page, 1);
  await elegirLayout(page, '1 (1×1)');

  const imagen = page.locator('[aria-label^="Hoja"] img').first();

  // Con «Maximizar» (el default) la imagen llena la celda, aunque se deforme.
  await expect(imagen).toHaveCSS('object-fit', 'fill');
  const llenando = await imagen.boundingBox();

  await page.getByLabel('Maximizar imágenes').uncheck();
  await expect(imagen).toHaveCSS('object-fit', 'contain');
  const ajustada = await imagen.boundingBox();

  // Al apagarlo, la imagen 2:1 conserva su proporción y deja bandas arriba y abajo.
  expect(ajustada!.height).toBeLessThan(llenando!.height);
  expect(ajustada!.width / ajustada!.height).toBeCloseTo(2, 1);
});

test('5 · el tamaño fijo de 5×5 cm mide exactamente eso en la hoja', async ({ page }) => {
  await subir(page, 1);
  await elegirLayout(page, '1 (1×1)');
  await page.getByLabel('Papel').selectOption('Carta');
  await page.getByLabel('Orientación').selectOption('Vertical');
  await page.getByLabel('Usar tamaño fijo').check();

  const hoja = page.locator('[aria-label^="Hoja"]');
  const imagen = hoja.locator('img').first();

  // La vista previa está a escala, así que se compara la PROPORCIÓN respecto a la hoja:
  // 5cm sobre 8.5 pulgadas (21.59cm) de ancho de papel.
  const cajaHoja = await hoja.boundingBox();
  const cajaImagen = await imagen.boundingBox();

  const anchoPapelCm = 8.5 * 2.54;
  expect((cajaImagen!.width / cajaHoja!.width) * anchoPapelCm).toBeCloseTo(5, 1);

  const altoPapelCm = 11 * 2.54;
  expect((cajaImagen!.height / cajaHoja!.height) * altoPapelCm).toBeCloseTo(5, 1);
});

test('6 · con márgenes de una pulgada, las celdas se encogen y no desbordan la hoja', async ({
  page,
}) => {
  await subir(page, 4);
  await elegirLayout(page, '4 (2×2)');

  const hoja = page.locator('[aria-label^="Hoja"]');
  const antes = await hoja.locator('img').first().boundingBox();

  await page.getByText('Márgenes y espaciado (pulgadas)').click();
  for (const margen of ['Izquierdo', 'Derecho', 'Superior', 'Inferior']) {
    await page.getByLabel(margen).fill('1');
  }

  const despues = await hoja.locator('img').first().boundingBox();
  expect(despues!.width).toBeLessThan(antes!.width);

  // Ninguna imagen se sale de la hoja.
  const cajaHoja = await hoja.boundingBox();
  for (const imagen of await hoja.locator('img').all()) {
    const caja = await imagen.boundingBox();
    expect(caja!.x).toBeGreaterThanOrEqual(cajaHoja!.x - 1);
    expect(caja!.y).toBeGreaterThanOrEqual(cajaHoja!.y - 1);
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(cajaHoja!.x + cajaHoja!.width + 1);
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(cajaHoja!.y + cajaHoja!.height + 1);
  }
});

test('7 · arrastrar la imagen 3 sobre la 1 las reordena', async ({ page }) => {
  // Tres colores distintos para poder ver quién quedó dónde.
  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles([
      archivoPng('uno.png', 200, 100, [255, 0, 0]),
      archivoPng('dos.png', 200, 100, [0, 255, 0]),
      archivoPng('tres.png', 200, 100, [0, 0, 255]),
    ]);
  await expect(page.locator('[data-prueba="miniatura"]')).toHaveCount(3);

  const miniaturas = page.locator('[data-prueba="miniatura"]');
  await expect(miniaturas.nth(0)).toHaveAttribute('title', 'uno.png');
  await expect(miniaturas.nth(2)).toHaveAttribute('title', 'tres.png');

  await miniaturas.nth(2).dragTo(miniaturas.nth(0));

  // «tres» pasa a la primera posición y las demás se recorren.
  await expect(miniaturas.nth(0)).toHaveAttribute('title', 'tres.png');
  await expect(miniaturas.nth(1)).toHaveAttribute('title', 'uno.png');
  await expect(miniaturas.nth(2)).toHaveAttribute('title', 'dos.png');
});

test('8 · guardar un preset, cambiarlo todo y cargarlo devuelve la configuración', async ({
  page,
}) => {
  await subir(page, 1);

  await page.getByLabel('Nombre del preset').fill('Mi acomodo');
  await elegirLayout(page, '6 (2×3)');
  await page.getByLabel('Papel').selectOption('Oficio');
  await page.getByRole('button', { name: 'Guardar' }).click();

  // Se cambia todo…
  await elegirLayout(page, '1 (1×1)');
  await page.getByLabel('Papel').selectOption('Carta');
  await page.getByLabel('Orientación').selectOption('Vertical');
  await page.getByLabel('Mostrar guías de corte').uncheck();

  // …y al cargarlo, vuelve.
  await page.getByLabel('Preset guardado').selectOption('Mi acomodo');

  await expect(page.getByLabel('Papel')).toHaveValue('Oficio');
  await expect(page.getByLabel('Filas')).toHaveValue('2');
  await expect(page.getByLabel('Columnas')).toHaveValue('3');
  await expect(page.getByLabel('Mostrar guías de corte')).toBeChecked();
});

test('8b · un .json exportado por la app de escritorio carga igual', async ({ page }) => {
  const deEscritorio = {
    PresetName: 'Del escritorio',
    Rows: 3,
    Columns: 3,
    MarginTop: 0.25,
    MarginBottom: 0.25,
    MarginLeft: 0.25,
    MarginRight: 0.25,
    Spacing: 0.15,
    PaperSize: 'Oficio',
    Orientation: 'Vertical',
    Dpi: 600,
    ShowCutGuides: false,
    RotateImages: true,
    MaximizeImages: false,
    UseCustomImageSize: false,
    CustomImageWidthCm: 5.0,
    CustomImageHeightCm: 5.0,
  };

  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: 'preset.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(deEscritorio)),
  });

  await expect(page.getByLabel('Nombre del preset')).toHaveValue('Del escritorio');
  await expect(page.getByLabel('Papel')).toHaveValue('Oficio');
  await expect(page.getByLabel('Orientación')).toHaveValue('Vertical');
  await expect(page.getByLabel('Filas')).toHaveValue('3');
  await expect(page.getByLabel('Mostrar guías de corte')).not.toBeChecked();
  await expect(page.getByLabel('Girar imágenes')).toBeChecked();
  await expect(page.getByLabel('Maximizar imágenes')).not.toBeChecked();
});

test('10 · sin llave de API, el buscador lo dice y no revienta', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));

  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByLabel('Qué buscar').fill('gato');
  await page.getByRole('dialog').getByRole('button', { name: 'Buscar' }).click();

  await expect(page.getByText(/Configura la API Key de Unsplash para buscar\./)).toBeVisible();
  expect(errores).toEqual([]);

  // Y el mensaje nombra al proveedor que se eligió.
  await page.getByLabel('Proveedor').selectOption('pixabay');
  await page.getByRole('dialog').getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByText(/Configura la API Key de Pixabay para buscar\./)).toBeVisible();
});

test('11 · el PDF se genera con tantas páginas como dice la vista previa', async ({ page }) => {
  await subir(page, 5);
  await elegirLayout(page, '4 (2×2)');
  await expect(page.locator('[data-prueba="paginacion"]')).toHaveText('Página 1 de 2');

  const descarga = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generar PDF' }).click(),
  ]).then(([d]) => d);

  const ruta = await descarga.path();
  const { readFileSync } = await import('node:fs');
  const bytes = readFileSync(ruta);

  expect(descarga.suggestedFilename()).toBe('acomodo.pdf');
  expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');

  // Se abre con pdf-lib en vez de buscar `/Type /Page` con una expresión regular: el PDF
  // sale con los objetos comprimidos y esa cadena no aparece en texto plano.
  const { PDFDocument } = await import('pdf-lib');
  const documento = await PDFDocument.load(bytes);

  // Dos páginas, las mismas que anuncia la vista previa.
  expect(documento.getPageCount()).toBe(2);

  // Y del tamaño correcto: Carta horizontal son 1056 × 816 px (1/96 de pulgada).
  const primera = documento.getPage(0);
  expect(primera.getWidth()).toBeCloseTo(1056, 0);
  expect(primera.getHeight()).toBeCloseTo(816, 0);
});

test('12 · con 30 imágenes la vista previa sigue respondiendo', async ({ page }) => {
  // Imágenes grandes de verdad: 1200×800 cada una.
  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles(Array.from({ length: 30 }, (_, i) => archivoPng(`grande-${i}.png`, 1200, 800)));
  await expect(page.locator('[data-prueba="miniatura"]')).toHaveCount(30, { timeout: 60_000 });

  await elegirLayout(page, '9 (3×3)');
  await expect(page.locator('[data-prueba="paginacion"]')).toHaveText('Página 1 de 4');

  // La interacción sigue siendo inmediata: cambiar de página responde sin esperas largas.
  const inicio = Date.now();
  await page.getByRole('button', { name: 'Siguiente ▶' }).click();
  await expect(page.locator('[data-prueba="paginacion"]')).toHaveText('Página 2 de 4');
  expect(Date.now() - inicio).toBeLessThan(3000);

  // En pantalla se pintan miniaturas, no los originales: ninguna imagen de la hoja pesa
  // los 1200px del archivo.
  const anchoNatural = await page
    .locator('[aria-label^="Hoja"] img')
    .first()
    .evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(anchoNatural).toBeLessThanOrEqual(400);
});
