import { config as cargarEnv } from 'dotenv';
import postgres from 'postgres';
import type { Page } from '@playwright/test';

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

/** Entra por la pantalla de login con usuario y contraseña. */
export async function entrarComo(page: Page, usuario: string, contrasena = 'password') {
  await page.goto('/login');
  const panel = page.getByRole('tabpanel', { name: 'Contraseña' });
  await panel.getByLabel('Usuario').fill(usuario);
  await panel.getByLabel('Contraseña').fill(contrasena);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/dashboard$/);
}

/** La existencia de un producto en una sucursal, leída directo de la base. */
export async function leerStock(productId: number, branchId: number): Promise<string> {
  const sql = conectar();
  try {
    const filas = await sql<{ stock: string }[]>`
      select stock from inventories
      where product_id = ${productId} and branch_id = ${branchId}
    `;
    return filas[0]?.stock ?? 'sin fila';
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Un producto por su código, para no depender de ids que cambian entre corridas. */
export async function productoPorCodigo(
  code: string,
): Promise<{ id: number; name: string; isActive: boolean } | null> {
  const sql = conectar();
  try {
    const filas = await sql<{ id: number; name: string; is_active: boolean }[]>`
      select id, name, is_active from products where code = ${code} limit 1
    `;
    const fila = filas[0];
    return fila ? { id: fila.id, name: fila.name, isActive: fila.is_active } : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Los códigos de los productos vendibles en una sucursal. Espeja el filtro de
 * `catalogoDeSucursal` (solo activos) con SQL suelto, porque ese módulo lleva
 * `server-only` y no se puede importar desde aquí.
 *
 * Que el producto desactivado desaparezca de la PANTALLA de caja se verifica en la Fase 4,
 * cuando esa pantalla existe; aquí se comprueba la regla de datos.
 */
export async function codigosVendibles(branchId: number): Promise<string[]> {
  const sql = conectar();
  try {
    const filas = await sql<{ code: string | null }[]>`
      select p.code
      from products p
      left join inventories i on i.product_id = p.id and i.branch_id = ${branchId}
      where p.is_active = true
      order by p.name
    `;
    return filas.map((f) => f.code).filter((c): c is string => c !== null);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Los ids de las dos sucursales de la semilla, por nombre. */
export async function sucursalPorNombre(name: string): Promise<number> {
  const sql = conectar();
  try {
    const filas = await sql<{ id: number }[]>`select id from branches where name = ${name} limit 1`;
    const id = filas[0]?.id;
    if (!id) throw new Error(`No existe la sucursal ${name}. ¿Corriste npm run db:seed?`);
    return id;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Borra lo que crean las pruebas de la Fase 2. Sin esto, cada corrida deja una sucursal,
 * una categoría, un usuario y un producto más en la base de desarrollo.
 *
 * Solo toca filas con la marca `e2e`, y solo en desarrollo: nunca hay historial colgando
 * de ellas, así que no contradice la regla de §10 de no borrar registros con historial.
 */
export async function limpiarRastrosE2E(): Promise<void> {
  const sql = conectar();
  try {
    await sql`delete from inventories where product_id in (select id from products where code like 'E2E-%')`;
    await sql`delete from products where code like 'E2E-%'`;
    await sql`delete from users where username like 'e2e%'`;
    await sql`delete from product_categories where name like 'Categoría e2e %'`;
    await sql`delete from branches where name like 'Sucursal e2e %'`;
  } finally {
    await sql.end({ timeout: 5 });
  }
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
