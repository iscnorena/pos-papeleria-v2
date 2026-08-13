import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/env';
import * as schema from './schema';

// Supabase en modo "pooler/transaction" (PgBouncer) NO soporta sentencias preparadas:
// `prepare: false` es obligatorio o las consultas fallan de forma intermitente.
//
// Cada invocación serverless puede caer en una instancia distinta (§1.1), así que el
// pool se mantiene chico y se reutiliza entre recargas en desarrollo para no agotar
// las conexiones de Supabase.

const crearCliente = () =>
  postgres(env.databaseUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
  });

const globalParaDb = globalThis as unknown as {
  clientePostgres?: ReturnType<typeof crearCliente>;
};

const cliente = globalParaDb.clientePostgres ?? crearCliente();

if (process.env.NODE_ENV !== 'production') {
  globalParaDb.clientePostgres = cliente;
}

export const db = drizzle(cliente, { schema });
export { schema };
