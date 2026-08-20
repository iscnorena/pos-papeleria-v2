import { expect, test } from '@playwright/test';

import { abrirTurnoDe, entrarComo, limpiarTurnos } from './ayudas';

// Precarga de Ticket por Voz (docs/modulo-venta-por-voz.md). La transcripción real depende
// del servicio de reconocimiento de Google detrás de `webkitSpeechRecognition`, que no es
// determinista en un navegador automatizado — el parseo y el emparejamiento por similitud ya
// están cubiertos a fondo en `src/lib/vozTicket.test.ts` y `src/lib/similitudTexto.test.ts`.
// Aquí solo se verifica que el botón se pinte (Chromium sí implementa la API) y que abrir y
// cerrar el panel de dictado no truene, sin depender de que la transcripción responda.

test.beforeEach(async () => {
  await limpiarTurnos();
});

test.afterAll(async () => {
  await limpiarTurnos();
});

test('1 · el botón "Dictar pedido" abre y cierra el panel sin tronar', async ({ page }) => {
  await page.context().grantPermissions(['microphone']);
  await abrirTurnoDe('cajera', '500.00');
  await entrarComo(page, 'cajera');
  await page.goto('/caja');

  const boton = page.getByRole('button', { name: /Dictar pedido/ });
  await expect(boton).toBeVisible();
  await boton.click();

  await expect(page.getByRole('heading', { name: 'Dictado del pedido' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('heading', { name: 'Dictado del pedido' })).toHaveCount(0);

  // La caja sigue funcionando con normalidad después de cerrar el panel.
  await expect(page.getByLabel('Buscar producto')).toBeVisible();
});
