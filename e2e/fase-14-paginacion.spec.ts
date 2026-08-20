import { expect, test } from '@playwright/test';

import { conectar, entrarComo, limpiarRastrosE2E, sucursalPorNombre } from './ayudas';

// Paginación en los listados administrativos (30 filas por página, `src/config/pos.ts`).
// Para no depender del tamaño del catálogo de la semilla, esta prueba siembra categorías de
// prueba propias y las limpia con el mismo patrón `'Categoría e2e %'` que ya usa
// `limpiarRastrosE2E`. El catálogo/inventario de la semilla (40 productos con inventario ×
// 2 sucursales) ya basta para probar inventario sin fixtures adicionales.

const PREFIJO = 'Categoría e2e paginación';

async function sembrarCategorias(cantidad: number): Promise<void> {
  const sql = conectar();
  try {
    for (let i = 1; i <= cantidad; i++) {
      await sql`insert into product_categories (name) values (${`${PREFIJO} ${String(i).padStart(3, '0')}`})`;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

test.beforeAll(async () => {
  await limpiarRastrosE2E();
  // 7 categorías de la semilla + 35 de prueba = 42 → ceil(42/30) = 2 páginas.
  await sembrarCategorias(35);
});

test.afterAll(async () => {
  await limpiarRastrosE2E();
});

test('1 · /categorias: 30 filas por página, "Siguiente" avanza, "Anterior" no aparece en la 1', async ({
  page,
}) => {
  await entrarComo(page, 'admin');
  await page.goto('/categorias');

  await expect(page.locator('tbody tr')).toHaveCount(30);
  await expect(page.getByText(/Página 1 de 2 · 42 en total/)).toBeVisible();
  await expect(page.getByRole('link', { name: '← Anterior' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Siguiente →' }).click();
  await expect(page).toHaveURL(/\/categorias\?pagina=2$/);
  await expect(page.locator('tbody tr')).toHaveCount(12);
  await expect(page.getByText(/Página 2 de 2 · 42 en total/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Siguiente →' })).toHaveCount(0);

  await page.getByRole('link', { name: '← Anterior' }).click();
  await expect(page).toHaveURL(/\/categorias\?pagina=1$/);
  await expect(page.locator('tbody tr')).toHaveCount(30);
});

test('2 · /inventario: la paginación conserva el filtro de sucursal activo', async ({ page }) => {
  const principal = await sucursalPorNombre('Principal');

  await entrarComo(page, 'admin');
  await page.goto(`/inventario?sucursal=${principal}`);

  // 40 productos con inventario en una sola sucursal → 2 páginas.
  await expect(page.locator('tbody tr')).toHaveCount(30);
  await expect(page.getByText(/Página 1 de 2/)).toBeVisible();

  const siguiente = page.getByRole('link', { name: 'Siguiente →' });
  await expect(siguiente).toHaveAttribute(
    'href',
    new RegExp(`sucursal=${principal}.*pagina=2|pagina=2.*sucursal=${principal}`),
  );

  await siguiente.click();
  await expect(page).toHaveURL(new RegExp(`/inventario\\?.*pagina=2`));
  // El filtro de sucursal se mantuvo: sigue habiendo filas de Principal, no de todas.
  await expect(page.locator('tbody tr')).toHaveCount(10);
});

test('3 · /proveedores: con pocos registros, no se muestra paginación', async ({ page }) => {
  await entrarComo(page, 'admin');
  await page.goto('/proveedores');

  await expect(page.getByRole('navigation', { name: 'Paginación' })).toHaveCount(0);
});
