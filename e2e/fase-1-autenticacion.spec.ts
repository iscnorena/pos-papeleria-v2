import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { contarIntentos, limpiarIntentos } from './ayudas';

/**
 * El panel de la pestaña «Contraseña». Hay que acotar la búsqueda a él: el `tabpanel`
 * toma su nombre accesible de la solapa, así que `getByLabel('Contraseña')` suelto
 * encuentra dos cosas — el panel y el campo — y Playwright se niega a adivinar.
 */
const panelContrasena = (page: Page) => page.getByRole('tabpanel', { name: 'Contraseña' });

/**
 * El aviso de error del formulario. Se acota al `<p>` porque Next monta su propio
 * anunciador de rutas con `role="alert"`, y `getByRole('alert')` encuentra los dos.
 */
const avisoError = (page: Page) => page.locator('p[role="alert"]');

// Los 5 criterios de aceptación de la Fase 1, uno por prueba, en el orden del documento.
// Las corridas van en serie (`workers: 1`) porque comparten la base de desarrollo.

test.beforeEach(async () => {
  await limpiarIntentos();
});

test.afterAll(async () => {
  await limpiarIntentos();
});

test('1a · admin/password entra', async ({ page }) => {
  await page.goto('/login');
  await panelContrasena(page).getByLabel('Usuario').fill('admin');
  await panelContrasena(page).getByLabel('Contraseña').fill('password');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Administración');
});

test('1b · la contraseña incorrecta no revela si el usuario existe', async ({ page }) => {
  // El mensaje de «usuario que existe con contraseña mala» y el de «usuario inexistente»
  // tienen que ser EL MISMO, o el login se vuelve un buscador de nombres de usuario.
  await page.goto('/login');
  await panelContrasena(page).getByLabel('Usuario').fill('admin');
  await panelContrasena(page).getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  const mensajeUsuarioReal = await avisoError(page).textContent();

  await page.goto('/login');
  await panelContrasena(page).getByLabel('Usuario').fill('nadie-con-este-nombre');
  await panelContrasena(page).getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  const mensajeUsuarioFalso = await avisoError(page).textContent();

  expect(mensajeUsuarioReal).toBe('Usuario o contraseña incorrectos.');
  expect(mensajeUsuarioFalso).toBe(mensajeUsuarioReal);
  await expect(page).toHaveURL(/\/login/);
});

test('2a · el PIN 1234 entra tecleando en el teclado físico', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'PIN' }).click();

  // Sin tocar los botones: se teclea igual que lo haría la cajera al cambiar de turno.
  await page.keyboard.type('1234');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Administración');
});

test('2b · el PIN 1234 entra a clics, y Retroceso borra', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'PIN' }).click();

  for (const digito of ['1', '2', '9']) {
    await page.getByRole('button', { name: digito, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Borrar un dígito' }).click(); // se va el 9
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar con PIN' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
});

test('3 · al sexto intento fallido de PIN, avisa que hay demasiados intentos', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'PIN' }).click();

  // Cada intento se confirma contra la base y no contra el texto en pantalla: el aviso del
  // intento anterior sigue visible mientras el siguiente viaja, así que esperar por el
  // texto deja pasar el bucle antes de tiempo y solo se registraban tres o cuatro intentos.
  for (let intento = 1; intento <= 5; intento++) {
    await page.keyboard.type('0000');
    await page.keyboard.press('Enter');
    await expect.poll(() => contarIntentos('pin'), { timeout: 10_000 }).toBe(intento);
    await expect(avisoError(page)).toHaveText('PIN incorrecto.');
  }

  await page.keyboard.type('0000');
  await page.keyboard.press('Enter');
  await expect(avisoError(page)).toHaveText('Demasiados intentos, espera unos minutos.');

  // El sexto ni siquiera se anota: se rechaza antes de comparar nada.
  expect(await contarIntentos('pin')).toBe(5);
});

test('4 · /dashboard sin sesión redirige a /login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?siguiente=%2Fdashboard$/);
});

test('5 · la cookie de sesión es httpOnly, sameSite lax y no viaja al cliente', async ({
  page,
  context,
}) => {
  await page.goto('/login');
  await panelContrasena(page).getByLabel('Usuario').fill('admin');
  await panelContrasena(page).getByLabel('Contraseña').fill('password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const cookie = (await context.cookies()).find((c) => c.name === 'pos.sesion');
  expect(cookie, 'no se encontró la cookie de sesión').toBeDefined();
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');

  // Y la prueba de verdad de `httpOnly`: JavaScript de la página no la ve.
  const visibleDesdeJs = await page.evaluate(() => document.cookie.includes('pos.sesion'));
  expect(visibleDesdeJs).toBe(false);
});
