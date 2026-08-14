import { defineConfig, devices } from '@playwright/test';

// §1 — Playwright solo para dos o tres flujos críticos por fase, no para los CRUD.
//
// `workers: 1` y `fullyParallel: false` a propósito: estas pruebas tocan la base de datos
// real de desarrollo (sesiones, intentos de login, stock). En paralelo se pisarían entre
// ellas y los fallos serían imposibles de leer.

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    // `localhost` y no `127.0.0.1`: el servidor de desarrollo de Next bloquea por seguridad
    // los recursos pedidos desde un origen distinto al suyo, y con la IP literal no cargaba
    // el JavaScript del cliente — el teclado del PIN nunca hidrataba y las pruebas fallaban
    // por una razón que no tenía nada que ver con el código.
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
