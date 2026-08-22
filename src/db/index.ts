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
//
// `connect_timeout` solo cubre abrir la conexión — no una consulta que YA está
// conectada pero se queda esperando un lock que sostiene una transacción zombi (ver
// "conexión zombi" en docs/aprendizajes-y-buenas-practicas.md). Sin un límite del lado
// de Postgres, esa espera no tenía techo propio: el 2026-08-22 una consulta así colgó
// una función serverless hasta el límite duro de Vercel (300s) en vez de fallar rápido.
// `statement_timeout` corta cualquier consulta que tarde de más; `idle_in_transaction_
// session_timeout` mata una transacción zombi en segundos en vez de que Supavisor
// tarde "varios minutos" en reciclarla — ambos se envían como parámetros de la sesión
// al conectar, así que aplican a cada conexión nueva del pool.

const enProduccion = process.env.NODE_ENV === 'production';

const crearCliente = () =>
  postgres(env.databaseUrl, {
    prepare: false,
    max: enProduccion ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
    connection: {
      statement_timeout: 10_000,
      idle_in_transaction_session_timeout: 10_000,
    },
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
