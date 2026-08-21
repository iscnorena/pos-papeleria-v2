import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  conectar,
  desactivarIntegracionClaudeDB,
  entrarComo,
  leerStock,
  limpiarRastrosE2E,
  limpiarRecepciones,
  prepararProducto,
  sucursalPorNombre,
} from './ayudas';
import { archivoPng } from './png';

// Módulo de Recepción de Mercancía (docs/modulo-recepcion-mercancia-xml.md): cuatro vías —
// captura manual, importación de CFDI XML, pegar un listado de texto (típicamente generado
// pidiéndole a Claude que lea la foto de un ticket) y subir la foto directo (si la
// integración con la API de Claude está activada)— que generan una pre-carga en borrador y
// solo tocan inventario al autorizar. Cubre las decisiones cerradas con el usuario: cajera
// puede crear/editar borradores pero no autorizar, solo admin autoriza, el UUID se libera
// al descartar, y la integración con Claude queda apagada por defecto hasta que un admin
// guarda una llave desde el modal.

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
  await desactivarIntegracionClaudeDB();
});

test.afterAll(async () => {
  await limpiarRecepciones();
  await limpiarRastrosE2E();
  await desactivarIntegracionClaudeDB();
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

test('3 · pegar texto: crea la pre-carga, se resuelve y autoriza igual que captura manual', async ({
  page,
}) => {
  const productId = await prepararProducto({
    code: 'E2E-REC-002',
    nombre: 'Producto E2E Recepción Texto',
    precio: '20.00',
    costo: '1.00',
    stock: '0.00',
  });
  const branchId = await sucursalPorNombre('Principal');

  await entrarComo(page, 'cajera');
  await page.goto('/recepcion/nueva');
  await page.getByRole('button', { name: 'Pegar texto' }).click();
  await page.getByLabel('Proveedor').selectOption({ label: 'Super Papelerías Tony' });
  await page.getByLabel('Referencia (opcional)').fill('E2E texto');
  await page.getByLabel('Listado pegado').fill('4 | Producto prueba E2E texto | 12.50');
  await page.getByRole('button', { name: 'Crear recepción' }).click();

  await expect(page).toHaveURL(/\/recepcion\/\d+$/);
  await expect(page.getByText('Super Papelerías Tony · Pegada desde texto')).toBeVisible();

  const fila = page.getByTestId('linea-recepcion').first();
  await expect(fila.getByText('Sin vincular')).toBeVisible();
  await fila.getByRole('button', { name: 'Vincular producto' }).click();
  await fila.getByLabel('Buscar producto').fill('Producto E2E Recepción Texto');
  await expect(fila.getByRole('button', { name: /Producto E2E Recepción Texto/ })).toBeVisible();
  await fila.getByRole('button', { name: /Producto E2E Recepción Texto/ }).click();
  await expect(fila.getByText('Sin vincular')).toHaveCount(0);

  const url = page.url();
  const antes = Number(await leerStock(productId, branchId));

  await entrarComo(page, 'admin');
  await page.goto(url);
  await page.getByRole('button', { name: 'Autorizar recepción' }).click();
  await expect(page.getByTestId('estado-recepcion')).toHaveText('Autorizada');
  const despues = Number(await leerStock(productId, branchId));
  expect(despues - antes).toBeCloseTo(4, 2);
});

test('4 · pegar texto: un formato inválido se rechaza y no crea nada', async ({ page }) => {
  await entrarComo(page, 'cajera');
  await page.goto('/recepcion/nueva');
  await page.getByRole('button', { name: 'Pegar texto' }).click();
  await page.getByLabel('Proveedor').selectOption({ label: 'Super Papelerías Tony' });
  await page.getByLabel('Listado pegado').fill('4 Producto sin separador 12.50');
  await page.getByRole('button', { name: 'Crear recepción' }).click();

  await expect(page.getByText(/no tiene el formato esperado/)).toBeVisible();
  await expect(page).toHaveURL(/\/recepcion\/nueva$/);
});

test('5 · sin llave configurada, "Subir foto" no aparece y solo admin ve cómo activarla', async ({
  page,
}) => {
  await entrarComo(page, 'cajera');
  await page.goto('/recepcion/nueva');
  await expect(page.getByRole('button', { name: 'Subir foto' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pegar texto' }).click();
  await expect(page.getByText(/Actívalo automático/)).toHaveCount(0);

  await entrarComo(page, 'admin');
  await page.goto('/recepcion/nueva');
  await expect(page.getByRole('button', { name: 'Subir foto' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pegar texto' }).click();
  await expect(page.getByText(/Actívalo automático/)).toBeVisible();
});

test('6 · admin activa la integración desde el modal y sube una foto', async ({ page }) => {
  test.skip(
    !process.env.ANTHROPIC_API_KEY_TEST,
    'Necesita una llave real de Claude (ANTHROPIC_API_KEY_TEST) para probar la integración.',
  );

  await entrarComo(page, 'admin');
  await page.goto('/recepcion/nueva');
  await page.getByRole('button', { name: 'Pegar texto' }).click();
  await page.getByRole('button', { name: /Actívalo automático/ }).click();
  await page.getByLabel('Clave de API').fill(process.env.ANTHROPIC_API_KEY_TEST!);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('button', { name: 'Subir foto' })).toBeVisible();

  await page.getByRole('button', { name: 'Subir foto' }).click();
  await page.getByLabel('Proveedor').selectOption({ label: 'Super Papelerías Tony' });
  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles(archivoPng('ticket-e2e.png', 400, 300));
  await page.getByRole('button', { name: 'Crear recepción' }).click();

  // Sin una foto real de un ticket de por medio, solo se puede afirmar que el sistema
  // completa el viaje redondo sin quedarse colgado: o crea la pre-carga (si Claude devolvió
  // líneas con el formato esperado) o muestra un error legible — p. ej. porque marcó algún
  // dato con "?", que el parser rechaza a propósito en vez de inventarlo.
  await expect(page.getByRole('alert').or(page.getByTestId('estado-recepcion'))).toBeVisible({
    timeout: 30000,
  });
});
