import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/env';
import * as schema from './schema';

// Supabase en modo "pooler/transaction" (PgBouncer) NO soporta sentencias preparadas:
// `prepare: false` es obligatorio o las consultas fallan de forma intermitente.
//
// El tamaño del pool NO puede ser el mismo en los dos entornos:
//
// - En producción, cada invocación serverless atiende una petición y puede caer en una
//   instancia distinta (§1.1). Una conexión por instancia es lo correcto: más solo
//   serviría para agotar antes el límite de Supabase.
//
// - En desarrollo, un único proceso atiende TODAS las peticiones. Con `max: 1`, cada
//   consulta de cada pestaña se forma en la misma fila detrás de una sola conexión, y
//   una consulta lenta congela la aplicación entera — incluido el login, que entonces
//   parece roto sin estarlo.
//
// `connect_timeout` está para que un intento de conexión atascado falle con un error
// legible en vez de quedarse colgado hasta que se rinda el navegador.

const enProduccion = process.env.NODE_ENV === 'production';

const crearCliente = () =>
  postgres(env.databaseUrl, {
    prepare: false,
    max: enProduccion ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
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
