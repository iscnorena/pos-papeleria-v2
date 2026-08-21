import { expect, test } from '@playwright/test';

import { entrarComo } from './ayudas';

// Selector de tema (Clásico/Moderno, src/components/ui/SelectorTema.tsx): dos identidades
// visuales permanentes, conmutables sin recargar, con la preferencia guardada en
// `localStorage` (no hay nada que limpiar en la base — es puramente del navegador).

test('1 · el selector cambia data-theme al instante y la preferencia persiste tras recargar', async ({
  page,
}) => {
  await entrarComo(page, 'admin');
  await page.goto('/dashboard');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'clasico');

  await page.getByRole('button', { name: /Cambiar a diseño Moderno/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'moderno');
  await expect(page.getByRole('button', { name: /Cambiar a diseño Clásico/i })).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'moderno');

  // Vuelve a clásico para no dejar la preferencia en "moderno" para la siguiente prueba
  // que corra en el mismo navegador/contexto persistente.
  await page.getByRole('button', { name: /Cambiar a diseño Clásico/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'clasico');
});

test('2 · el selector también está en /kit (sin sesión) y en /login', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('/kit');
  await expect(page.getByRole('button', { name: /Cambiar a diseño Moderno/i })).toBeVisible();

  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Cambiar a diseño Moderno/i })).toBeVisible();
});
