import { expect, test } from '@playwright/test';

import { abrirTurnoDe, entrarComo, limpiarTurnos } from './ayudas';

// Los 4 criterios de aceptación de la Fase 3.
//
// Todavía no hay ventas (llegan en la Fase 4), así que el efectivo esperado es el fondo de
// caja. El cálculo con ventas reales se prueba en la Fase 4, que es donde existe.

test.beforeEach(async () => {
  await limpiarTurnos();
});

test.afterAll(async () => {
  await limpiarTurnos();
});

test('1 · abrir turno con fondo $500, y no poder abrir un segundo', async ({ page }) => {
  await entrarComo(page, 'cajera');

  await page.goto('/turnos/abrir');
  await page.getByLabel('Fondo de caja').fill('500');
  await page.getByRole('button', { name: 'Abrir turno' }).click();

  await expect(page).toHaveURL(/\/turnos$/);
  // Se acota al cuerpo de la tabla: la fila de encabezado también dice «Abierto».
  const fila = page.locator('tbody tr').filter({ hasText: 'Abierto' });
  await expect(fila).toContainText('$500.00');

  // Con un turno abierto, la pantalla de apertura ya no se ofrece: manda al listado.
  await page.goto('/turnos/abrir');
  await expect(page).toHaveURL(/\/turnos$/);
  await expect(page.getByRole('link', { name: 'Abrir turno' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Cerrar turno' })).toBeVisible();
});

test('2 · sin turno abierto, /caja redirige a la pantalla de apertura', async ({ page }) => {
  await entrarComo(page, 'cajera');

  await page.goto('/caja');
  await expect(page).toHaveURL(/\/turnos\/abrir$/);
  await expect(page.getByRole('heading', { name: 'Abrir turno' })).toBeVisible();

  // Y con turno abierto, la caja se deja entrar.
  await page.getByLabel('Fondo de caja').fill('500');
  await page.getByRole('button', { name: 'Abrir turno' }).click();
  await expect(page).toHaveURL(/\/turnos$/);

  await page.goto('/caja');
  await expect(page).toHaveURL(/\/caja$/);
});

test('3 · la diferencia sale $0.00 en visto cuadrando, y −$50.00 en sello faltando', async ({
  page,
}) => {
  await entrarComo(page, 'cajera');

  // ── Cuadrado: se cuenta exactamente lo esperado ─────────────────────────────────
  const turnoCuadrado = await abrirTurnoDe('cajera', '500.00');
  await page.goto(`/turnos/${turnoCuadrado}/cerrar`);
  await expect(page.getByText('Efectivo esperado')).toBeVisible();

  await page.getByLabel('Efectivo contado').fill('500');
  const diferenciaEnVivo = page.locator('[aria-live="polite"]');
  await expect(diferenciaEnVivo).toHaveText('$0.00');
  // El color es parte del criterio: cero en `visto`.
  await expect(diferenciaEnVivo).toHaveClass(/text-visto/);

  await page.getByRole('button', { name: 'Cerrar turno' }).click();
  await page.getByRole('button', { name: 'Sí, cerrar' }).click();

  await expect(page).toHaveURL(new RegExp(`/turnos/${turnoCuadrado}$`));
  // Se busca el `dd` que cuelga del `dt` «Diferencia»: en el detalle también valen $0.00
  // el ingreso y la ganancia, y `.first()` cogía cualquiera de ellos.
  const diferenciaGuardadaCero = page.locator('div:has(> dt:text-is("Diferencia")) > dd');
  await expect(diferenciaGuardadaCero).toHaveText('$0.00');
  await expect(diferenciaGuardadaCero).toHaveClass(/text-visto/);

  // ── Faltante: $50 menos ─────────────────────────────────────────────────────────
  const turnoCorto = await abrirTurnoDe('cajera', '500.00');
  await page.goto(`/turnos/${turnoCorto}/cerrar`);
  await page.getByLabel('Efectivo contado').fill('450');
  await expect(diferenciaEnVivo).toHaveText('-$50.00');
  await expect(diferenciaEnVivo).toHaveClass(/text-sello/);
  await expect(page.getByText('Falta $50.00 respecto a lo esperado.')).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar turno' }).click();
  await page.getByRole('button', { name: 'Sí, cerrar' }).click();

  await expect(page).toHaveURL(new RegExp(`/turnos/${turnoCorto}$`));
  const diferenciaGuardada = page.locator('div:has(> dt:text-is("Diferencia")) > dd');
  await expect(diferenciaGuardada).toHaveText('-$50.00');
  await expect(diferenciaGuardada).toHaveClass(/text-sello/);
});

test('4 · una cajera no ve los turnos de otra; el admin ve todos', async ({ page }) => {
  const turnoDeCajera = await abrirTurnoDe('cajera', '300.00');
  const turnoDeMaria = await abrirTurnoDe('maria', '700.00');

  // La cajera solo ve el suyo, y el de María ni siquiera existe para ella.
  await entrarComo(page, 'cajera');
  await page.goto('/turnos');
  await expect(page.locator('tbody').getByText('Cajera', { exact: true })).toBeVisible();
  await expect(page.locator('tbody').getByText('María', { exact: true })).toHaveCount(0);

  const respuesta = await page.goto(`/turnos/${turnoDeMaria}`);
  expect(respuesta?.status()).toBe(404);

  // El admin ve los dos.
  await entrarComo(page, 'admin');
  await page.goto('/turnos');
  await expect(page.locator('tbody').getByText('Cajera', { exact: true })).toBeVisible();
  await expect(page.locator('tbody').getByText('María', { exact: true })).toBeVisible();

  const comoAdmin = await page.goto(`/turnos/${turnoDeCajera}`);
  expect(comoAdmin?.status()).toBe(200);
});
