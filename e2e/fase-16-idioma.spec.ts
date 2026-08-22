import { expect, test } from '@playwright/test';

import { entrarComo } from './ayudas';

// Selector de idioma (Español/Inglés, src/components/ui/SelectorIdioma.tsx): a diferencia
// del de tema, cambia contenido que generan Server Components, así que necesita una cookie
// (no localStorage) y un `router.refresh()` — ver src/lib/i18n/servidor.ts. Nada que
// limpiar en la base: la preferencia vive en la cookie del navegador.

test('1 · el selector cambia el idioma, <html lang> cambia, y persiste tras recargar', async ({
  page,
}) => {
  await entrarComo(page, 'admin');
  await page.goto('/dashboard');

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { name: /Buen día/ })).toBeVisible();

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Switch to Spanish' })).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible();

  // Vuelve a español para no dejar la cookie en "en" para la siguiente prueba que corra
  // en el mismo navegador/contexto persistente.
  await page.getByRole('button', { name: 'Switch to Spanish' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('2 · el selector también está en /kit (sin sesión) y en /login', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('/kit');
  await expect(page.getByRole('button', { name: 'Switch to English' })).toBeVisible();

  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Switch to English' })).toBeVisible();
});
