import { expect, test } from '@playwright/test';

import {
  codigosVendibles,
  entrarComo,
  leerStock,
  limpiarRastrosE2E,
  productoPorCodigo,
  sucursalPorNombre,
} from './ayudas';

// Los 4 criterios de aceptación de la Fase 2. Corren en serie contra la base de desarrollo
// y comparten el producto que crea la primera: por eso el orden importa y `workers` es 1.

const CODIGO_PRUEBA = `E2E-${Date.now()}`;

test.beforeAll(async () => {
  await limpiarRastrosE2E();
});

test.afterAll(async () => {
  await limpiarRastrosE2E();
});

test('1 · crear y editar sucursal, categoría, usuario y producto, con el error en su campo', async ({
  page,
}) => {
  await entrarComo(page, 'admin');

  // ── Sucursal ────────────────────────────────────────────────────────────────────
  await page.goto('/sucursales');
  const marca = Date.now();
  await page.getByLabel('Nombre').fill(`Sucursal e2e ${marca}`);
  await page.getByRole('button', { name: 'Crear sucursal' }).click();
  await expect(page.getByText('Sucursal creada.')).toBeVisible();
  await expect(page.getByRole('cell', { name: `Sucursal e2e ${marca}` })).toBeVisible();

  // ── Categoría, y la validación en el campo que falla ────────────────────────────
  await page.goto('/categorias');
  // Se envía vacío a propósito: el mensaje tiene que salir pegado al campo Nombre, no en
  // un resumen arriba. `aria-describedby` es lo que ata el error a su campo.
  await page.getByLabel('Nombre').fill('   ');
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  const campoNombre = page.getByLabel('Nombre');
  await expect(campoNombre).toHaveAttribute('aria-invalid', 'true');
  const idDescripcion = await campoNombre.getAttribute('aria-describedby');
  expect(idDescripcion).toBeTruthy();
  await expect(page.locator(`#${idDescripcion}`)).toHaveText('La categoría necesita un nombre.');

  await campoNombre.fill(`Categoría e2e ${marca}`);
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  await expect(page.getByText('Categoría creada.')).toBeVisible();

  // ── Usuario ─────────────────────────────────────────────────────────────────────
  await page.goto('/usuarios');
  await page.getByLabel('Nombre', { exact: true }).fill('Usuaria e2e');
  // `exact` porque el texto de ayuda de la casilla «Activo» también dice «usuario».
  await page.getByLabel('Usuario', { exact: true }).fill(`e2e${marca}`);
  await page.getByLabel('Sucursal').selectOption({ label: 'Principal' });
  await page.getByLabel('Contraseña', { exact: true }).fill('secreta123');
  await page.getByRole('button', { name: 'Crear usuario' }).click();
  await expect(page.getByText('Usuario creado.')).toBeVisible();

  // ── Producto ────────────────────────────────────────────────────────────────────
  await page.goto('/productos');
  await page.getByLabel('Nombre').fill('Producto de prueba e2e');
  await page.getByLabel('Código').fill(CODIGO_PRUEBA);
  await page.getByLabel('Costo').fill('10.00');
  await page.getByLabel('Precio de venta').fill('18.50');
  await page.getByRole('button', { name: 'Crear producto' }).click();
  await expect(page.getByText('Producto creado.')).toBeVisible();

  // Y editarlo: el precio cambia y se ve en la tabla.
  const creado = await productoPorCodigo(CODIGO_PRUEBA);
  expect(creado).not.toBeNull();
  await page.goto(`/productos?editar=${creado!.id}`);
  await page.getByLabel('Precio de venta').fill('21.00');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Producto actualizado.')).toBeVisible();
  await expect(page.getByRole('cell', { name: '$21.00' }).first()).toBeVisible();
});

test('2 · una cajera que escriba /productos a mano recibe 403', async ({ page }) => {
  await entrarComo(page, 'cajera');

  // La navegación no muestra el enlace…
  await expect(page.getByRole('link', { name: 'Productos' })).toHaveCount(0);

  // …y escribir la URL igual no sirve: el servidor responde 403, no una redirección.
  for (const ruta of ['/productos', '/categorias', '/inventario', '/usuarios', '/sucursales']) {
    const respuesta = await page.goto(ruta);
    expect(respuesta?.status(), `${ruta} debería dar 403`).toBe(403);
    await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible();
  }
});

test('3 · ajustar existencia en una sucursal no toca la otra', async ({ page }) => {
  const principal = await sucursalPorNombre('Principal');
  const segunda = await sucursalPorNombre('Sucursal 2');
  const producto = await productoPorCodigo('CUA-001');
  expect(producto).not.toBeNull();

  const antesEnSegunda = await leerStock(producto!.id, segunda);

  await entrarComo(page, 'admin');
  await page.goto(`/inventario?sucursal=${principal}&buscar=CUA-001`);

  const fila = page.getByRole('row').filter({ hasText: 'CUA-001' });
  await fila.getByLabel('Existencia').fill('77');
  await fila.getByRole('button', { name: 'Ajustar' }).click();
  await expect(fila.getByText('✓')).toBeVisible();

  expect(await leerStock(producto!.id, principal)).toBe('77.00');
  expect(await leerStock(producto!.id, segunda)).toBe(antesEnSegunda);
});

test('4 · desactivar un producto lo saca del catálogo de la caja sin borrar su historial', async ({
  page,
}) => {
  const principal = await sucursalPorNombre('Principal');
  const producto = await productoPorCodigo(CODIGO_PRUEBA);
  expect(producto, 'la prueba 1 debe haber creado el producto').not.toBeNull();

  // Antes: es vendible.
  expect(await codigosVendibles(principal)).toContain(CODIGO_PRUEBA);

  await entrarComo(page, 'admin');
  await page.goto(`/productos?editar=${producto!.id}`);
  await page.getByLabel('Activo').uncheck();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Producto actualizado.')).toBeVisible();

  // Después: ya no es vendible…
  expect(await codigosVendibles(principal)).not.toContain(CODIGO_PRUEBA);

  // …pero la fila sigue ahí, que es la mitad que de verdad importa: nada se borra (§10).
  const sigue = await productoPorCodigo(CODIGO_PRUEBA);
  expect(sigue).not.toBeNull();
  expect(sigue!.isActive).toBe(false);

  // Y sigue visible en la pantalla de administración, marcado como inactivo.
  await page.goto('/productos');
  const fila = page.getByRole('row').filter({ hasText: CODIGO_PRUEBA });
  await expect(fila).toBeVisible();
  await expect(fila.getByText('Inactivo')).toBeVisible();
});
