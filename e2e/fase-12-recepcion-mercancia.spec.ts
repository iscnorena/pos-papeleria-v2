import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  conectar,
  entrarComo,
  leerStock,
  limpiarRastrosE2E,
  limpiarRecepciones,
  prepararProducto,
  sucursalPorNombre,
} from './ayudas';

// Módulo de Recepción de Mercancía (docs/modulo-recepcion-mercancia-xml.md): dos vías —
// captura manual e importación de CFDI XML— que generan una pre-carga en borrador y solo
// tocan inventario al autorizar. Cubre las decisiones cerradas con el usuario: cajera puede
// crear/editar borradores pero no autorizar, solo admin autoriza, y el UUID se libera al
// descartar.

const FIXTURE_XML = path.join(
  __dirname,
  '..',
  'src',
  'lib',
  'cfdi',
  'fixtures',
  'cfdi-tony-ejemplo.xml',
);

test.beforeEach(async () => {
  await limpiarRecepciones();
  await limpiarRastrosE2E();
});

test.afterAll(async () => {
  await limpiarRecepciones();
  await limpiarRastrosE2E();
});

test('1 · captura manual: cajera crea y resuelve, solo admin autoriza y suma stock', async ({
  page,
}) => {
  const productId = await prepararProducto({
    code: 'E2E-REC-001',
    nombre: 'Producto E2E Recepción',
    precio: '20.00',
    costo: '1.00',
    stock: '0.00',
  });
  const branchId = await sucursalPorNombre('Principal');

  await entrarComo(page, 'cajera');
  await page.goto('/recepcion/nueva');
  await page.getByRole('button', { name: 'Captura manual' }).click();
  await page.getByLabel('Proveedor').selectOption({ label: 'Super Papelerías Tony' });
  await page.getByLabel('Referencia (opcional)').fill('E2E manual');
  await page.getByRole('button', { name: 'Crear recepción' }).click();

  await expect(page).toHaveURL(/\/recepcion\/\d+$/);

  // Agrega una línea a mano (todavía no hay ninguna: sin ambigüedad de etiquetas repetidas).
  await page.getByLabel('Descripción', { exact: true }).fill('Producto prueba E2E manual');
  await page.getByLabel('Cantidad').fill('5');
  await page.getByLabel('Costo unitario').fill('10.00');
  await page.getByRole('button', { name: 'Agregar línea' }).click();

  // Una sola línea a esta altura: no hace falta filtrar por texto (que además viviría
  // dentro de un <input>, fuera del alcance de `hasText`, que solo mira textContent).
  const fila = page.getByTestId('linea-recepcion').first();
  await expect(fila.getByText('Sin vincular')).toBeVisible();

  // Vincula el producto de prueba vía sugerencia por similitud.
  await fila.getByRole('button', { name: 'Vincular producto' }).click();
  await fila.getByLabel('Buscar producto').fill('Producto E2E Recepción');
  await expect(fila.getByRole('button', { name: /Producto E2E Recepción/ })).toBeVisible();
  await fila.getByRole('button', { name: /Producto E2E Recepción/ }).click();

  await expect(fila.getByText('Sin vincular')).toHaveCount(0);
  await expect(fila.getByText('Producto E2E Recepción')).toBeVisible();

  // Cajera no puede autorizar: el botón ni siquiera se ofrece.
  await expect(page.getByRole('button', { name: 'Autorizar recepción' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descartar recepción' })).toBeVisible();

  const url = page.url();
  const antes = Number(await leerStock(productId, branchId));

  // Admin sí puede: entra a la misma recepción y autoriza.
  await entrarComo(page, 'admin');
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Autorizar recepción' })).toBeVisible();
  await page.getByRole('button', { name: 'Autorizar recepción' }).click();

  await expect(page.getByTestId('estado-recepcion')).toHaveText('Autorizada');
  const despues = Number(await leerStock(productId, branchId));
  expect(despues - antes).toBeCloseTo(5, 2);
});

test('2 · importar XML: crea la pre-carga, rechaza reimportar por UUID, libera el UUID al descartar', async ({
  page,
}) => {
  await entrarComo(page, 'admin');

  await page.goto('/recepcion/nueva');
  await page.setInputFiles('#archivo', FIXTURE_XML);
  await page.locator('form').getByRole('button', { name: 'Importar XML' }).click();

  await expect(page).toHaveURL(/\/recepcion\/\d+$/);
  await expect(page.getByText('Super Papelerías Tony · Importada de XML')).toBeVisible();
  await expect(page.getByText('333-132595')).toBeVisible();
  await expect(page.getByTestId('linea-recepcion').first().getByText('Sin vincular')).toBeVisible();

  // Reimportar el mismo XML se rechaza por UUID duplicado.
  await page.goto('/recepcion/nueva');
  await page.setInputFiles('#archivo', FIXTURE_XML);
  await page.locator('form').getByRole('button', { name: 'Importar XML' }).click();
  await expect(page.getByText(/ya fue importada/)).toBeVisible();
  await expect(page).toHaveURL(/\/recepcion\/nueva$/);

  // Se descarta la primera; el UUID queda libre y la reimportación ahora sí procede.
  const sql = conectar();
  const [fila] = await sql<{ id: number }[]>`
    select id from goods_receipts where cfdi_uuid = '7A3B21F0-4C5D-4E9A-8B6F-1234567890AB' limit 1
  `;
  await sql.end({ timeout: 5 });
  if (!fila) throw new Error('No se encontró la recepción importada');

  await page.goto(`/recepcion/${fila.id}`);
  await page.getByRole('button', { name: 'Descartar recepción' }).click();
  await page.getByRole('button', { name: 'Confirmar descarte' }).click();
  await expect(page.getByTestId('estado-recepcion')).toHaveText('Descartada');

  await page.goto('/recepcion/nueva');
  await page.setInputFiles('#archivo', FIXTURE_XML);
  await page.locator('form').getByRole('button', { name: 'Importar XML' }).click();
  await expect(page).toHaveURL(/\/recepcion\/\d+$/);
  await expect(page.getByText('Super Papelerías Tony · Importada de XML')).toBeVisible();
});
