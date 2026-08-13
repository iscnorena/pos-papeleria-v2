import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Apaga las reglas de formato que pelearían con Prettier. Va al final.
  prettier,
  {
    rules: {
      // §2: la llave de servicio y las de los bancos de imágenes nunca salen al
      // navegador. Esta regla no las detecta sola, pero sí atrapa el `any` con el
      // que normalmente se cuelan errores de tipos en las Server Actions.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'drizzle/**', 'next-env.d.ts']),
]);

export default eslintConfig;
