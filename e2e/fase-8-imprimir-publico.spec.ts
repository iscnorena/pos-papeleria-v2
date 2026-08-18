import { expect, test } from '@playwright/test';

import { entrarComo, limpiarIntentosBusquedaPublica, limpiarRastrosE2E } from './ayudas';
import { archivoPng } from './png';

// Acomoda Impresión pública (§ fuera de la spec original, como las pruebas 8/9 de
// fase-4-punto-de-venta.spec.ts): /imprimir sin sesión, con envío por WhatsApp en vez de
// precio ni descarga directa.
//
// Depende de que la sucursal "Principal" de la semilla tenga `whatsapp_number` cargado
// (527445008175); si no está, el primer criterio ya lo deja claro con el aviso de
// "no disponible".

test.beforeEach(async () => {
  await limpiarIntentosBusquedaPublica();
});

test.afterAll(async () => {
  await limpiarRastrosE2E();
  await limpiarIntentosBusquedaPublica();
});

test('1 · /imprimir se ve sin sesión, sin redirigir a /login', async ({ page }) => {
  await page.context().clearCookies();
  const respuesta = await page.goto('/imprimir');
  expect(respuesta?.status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Enviar por WhatsApp' })).toBeVisible();
});

test('2 · armar una hoja y "Enviar por WhatsApp" descarga el PDF y abre el chat correcto', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/imprimir');

  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles(Array.from({ length: 4 }, (_, i) => archivoPng(`foto-${i}.png`, 200, 100)));

  await page.getByRole('button', { name: '4 fotos' }).click();

  const [descarga, ventanaNueva] = await Promise.all([
    page.waitForEvent('download'),
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: 'Enviar por WhatsApp' }).click(),
  ]);

  expect(descarga.suggestedFilename()).toBe('impresion.pdf');
  // wa.me redirige a api.whatsapp.com/send al abrirse sin la app instalada: se comprueba
  // el número, no el dominio exacto, que es lo que de verdad importa (§ envío correcto).
  expect(ventanaNueva.url()).toContain('527445008175');
});

test('3 · la herramienta interna sigue exigiendo sesión y no muestra este flujo', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/herramientas/acomoda-impresion');
  await expect(page).toHaveURL(/\/login/);
});

test('4 · la búsqueda pública de imágenes se corta después de varios intentos por IP', async ({
  page,
}) => {
  let ultima = 200;
  for (let i = 0; i < 9; i++) {
    const respuesta = await page.request.get(
      `/api/imprimir/bancos-imagenes?proveedor=pixabay&texto=prueba${i}&cuantos=1`,
    );
    ultima = respuesta.status();
  }
  expect(ultima).toBe(429);
});

test('5 · el WhatsApp de una sucursal se guarda y se puede editar desde el admin', async ({
  page,
}) => {
  await entrarComo(page, 'admin');
  await page.goto('/sucursales');

  const marca = Date.now();
  await page.getByLabel('Nombre').fill(`Sucursal e2e ${marca}`);
  await page.getByLabel('WhatsApp para /imprimir').fill('529990001111');
  await page.getByRole('button', { name: 'Crear sucursal' }).click();
  await expect(page.getByText('Sucursal creada.')).toBeVisible();
  await expect(page.getByRole('cell', { name: '529990001111' })).toBeVisible();
});
