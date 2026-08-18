import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

import { entrarComo } from './ayudas';

// Los 3 criterios de aceptación de la Fase 6.

const REGISTRO = 'src/tools/registry.ts';

test('1 · agregar una herramienta al arreglo la hace aparecer sin tocar nada más', async ({
  page,
}) => {
  const original = readFileSync(REGISTRO, 'utf8');

  // Se agrega una entrada de prueba al registro y NADA MÁS: ni rutas, ni componentes, ni
  // navegación. Si hiciera falta tocar otro archivo, este criterio no se cumpliría.
  const conPrueba = original.replace(
    'export const HERRAMIENTAS: Herramienta[] = [',
    `export const HERRAMIENTAS: Herramienta[] = [
  {
    id: 'prueba-e2e',
    nombre: 'Herramienta de prueba',
    descripcion: 'Existe solo mientras corre esta prueba.',
    icono: IconoCalculadora,
    ruta: '/herramientas/prueba-e2e',
    roles: ['admin', 'cajera'],
    estado: 'lista',
  },`,
  );

  try {
    writeFileSync(REGISTRO, conPrueba);

    await entrarComo(page, 'cajera');
    await page.goto('/herramientas');

    // Aparece en la vitrina…
    await expect(page.getByText('Herramienta de prueba')).toBeVisible();

    // …y su ruta responde, porque el registro también manda ahí.
    const respuesta = await page.goto('/herramientas/prueba-e2e');
    expect(respuesta?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Herramienta de prueba' })).toBeVisible();
  } finally {
    // El registro vuelve a como estaba, pase lo que pase.
    writeFileSync(REGISTRO, original);
  }
});

test('2 · una herramienta de solo admin no se ve como cajera, y por URL da 403', async ({
  page,
}) => {
  // «Etiquetas y códigos de barras» está declarada con roles: ['admin'].
  await entrarComo(page, 'cajera');
  await page.goto('/herramientas');
  await expect(page.getByText('Etiquetas y códigos de barras')).toHaveCount(0);

  const comoCajera = await page.goto('/herramientas/etiquetas');
  expect(comoCajera?.status()).toBe(403);
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible();

  // El admin sí la ve y sí entra.
  await entrarComo(page, 'admin');
  await page.goto('/herramientas');
  await expect(page.getByText('Etiquetas y códigos de barras')).toBeVisible();

  const comoAdmin = await page.goto('/herramientas/etiquetas');
  expect(comoAdmin?.status()).toBe(200);
});

test('3 · las tarjetas «próxima» se ven atenuadas y no son clicables', async ({ page }) => {
  await entrarComo(page, 'admin');
  await page.goto('/herramientas');

  // Quedan en `proxima` las que ninguna fase posterior construyó todavía. "Herramientas de
  // PDF" salió de esta lista el 18 de agosto: ya tiene su primera sub-herramienta (Unir).
  const proximas = ['Cotizador de trabajos', 'Etiquetas y códigos de barras'];

  for (const nombre of proximas) {
    const tarjeta = page.locator('li').filter({ hasText: nombre });
    await expect(tarjeta).toBeVisible();

    // Atenuada…
    await expect(tarjeta.locator('[aria-disabled="true"]')).toBeVisible();
    await expect(tarjeta.locator('.opacity-60')).toBeVisible();
    await expect(tarjeta.getByText('Próxima')).toBeVisible();

    // …y sin enlace: no hay nada que clicar ni a dónde tabular.
    await expect(tarjeta.getByRole('link')).toHaveCount(0);
  }
});
