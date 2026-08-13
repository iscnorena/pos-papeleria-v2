import { config as cargarEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Next.js lee `.env.local`; drizzle-kit corre fuera de Next y no lo sabe.
cargarEnv({ path: '.env.local' });
cargarEnv();

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'Falta DATABASE_URL. Copia .env.example a .env.local y pon la cadena de Supabase.',
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  // Supabase crea estos esquemas por su cuenta; que drizzle-kit no intente tocarlos.
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
