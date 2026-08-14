import { config as cargarEnv } from 'dotenv';
import postgres from 'postgres';

cargarEnv({ path: '.env.local', quiet: true });

/**
 * Conexión suelta para preparar y limpiar datos desde las pruebas. No usa `src/db`
 * porque ese módulo lleva `server-only` y solo corre dentro del servidor de Next.
 */
export function conectar() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL: las pruebas necesitan la base de desarrollo.');
  return postgres(url, { prepare: false, max: 1 });
}

/** Cuántos intentos fallidos hay registrados. §5 los exige en la base, no en memoria. */
export async function contarIntentos(tipo = 'pin'): Promise<number> {
  const sql = conectar();
  try {
    const filas = await sql<{ n: number }[]>`
      select count(*)::int as n from login_attempts where kind = ${tipo}
    `;
    return filas[0]?.n ?? 0;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Borra los intentos de login registrados. La prueba del límite de intentos deja la IP
 * bloqueada 15 minutos; sin esta limpieza, la siguiente corrida empezaría bloqueada.
 */
export async function limpiarIntentos(): Promise<void> {
  const sql = conectar();
  try {
    await sql`delete from login_attempts`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
