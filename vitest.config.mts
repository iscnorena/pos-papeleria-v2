import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Vitest cubre la lógica pura (dinero, folios, retícula de impresión). Los flujos de
// navegador son de Playwright, que vive en `e2e/` — de ahí la exclusión.

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
});
