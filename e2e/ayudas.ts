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

/**
 * Entra por la pantalla de login con usuario y contraseña.
 *
 * Limpia las cookies primero: con una sesión viva, el `proxy` desvía `/login` a `/` y el
 * formulario no llega a existir. Esto permite encadenar varios usuarios en una prueba.
 */
export async function entrarComo(page: Page, usuario: string, contrasena = 'password') {
  await page.context().clearCookies();
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

/** Borra turnos y todo lo que cuelga de ellos. Deja la caja como recién instalada. */
export async function limpiarTurnos(): Promise<void> {
  const sql = conectar();
  try {
    await sql`delete from shift_payments`;
    await sql`delete from sale_payments`;
    await sql`delete from sale_items`;
    await sql`delete from sales`;
    await sql`delete from cash_register_shifts`;
    await sql`delete from folios`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Abre un turno directo en la base, para preparar escenarios sin pasar por la interfaz. */
export async function abrirTurnoDe(username: string, fondo = '500.00'): Promise<number> {
  const sql = conectar();
  try {
    const filas = await sql<{ id: number }[]>`
      insert into cash_register_shifts (user_id, branch_id, opening_amount)
      select id, branch_id, ${fondo} from users where username = ${username}
      returning id
    `;
    const id = filas[0]?.id;
    if (!id) throw new Error(`No se pudo abrir turno para ${username}`);
    return id;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Crea (o repone) un producto de prueba con precio y existencia exactos, en ambas
 * sucursales. Los precios de la semilla son los del negocio y no cuadran con los importes
 * que piden los criterios, así que las pruebas traen los suyos.
 */
export async function prepararProducto(opciones: {
  code: string;
  nombre: string;
  precio: string;
  costo: string;
  stock: string;
  manejaInventario?: boolean;
  precioAbierto?: boolean;
}): Promise<number> {
  const sql = conectar();
  try {
    const manejaInventario = opciones.manejaInventario ?? true;
    const precioAbierto = opciones.precioAbierto ?? false;

    const [existente] = await sql<{ id: number }[]>`
      select id from products where code = ${opciones.code} limit 1`;

    const id =
      existente?.id ??
      (
        await sql<{ id: number }[]>`
          insert into products (name, code, sale_price, cost_price, manages_inventory, open_price)
          values (${opciones.nombre}, ${opciones.code}, ${opciones.precio}, ${opciones.costo}, true, false)
          returning id`
      )[0]!.id;

    await sql`
      update products
      set sale_price = ${opciones.precio}, cost_price = ${opciones.costo},
          name = ${opciones.nombre}, is_active = true, manages_inventory = ${manejaInventario},
          open_price = ${precioAbierto}
      where id = ${id}`;

    if (manejaInventario) {
      const sucursales = await sql<{ id: number }[]>`select id from branches`;
      for (const s of sucursales) {
        await sql`
          insert into inventories (product_id, branch_id, stock)
          values (${id}, ${s.id}, ${opciones.stock})
          on conflict (product_id, branch_id) do update set stock = ${opciones.stock}`;
      }
    }
    return id;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Las ventas registradas, de la más nueva a la más vieja, con sus pagos. */
export async function ventasRecientes(limite = 10) {
  const sql = conectar();
  try {
    const ventas = await sql<
      { id: number; ticket_number: string; total: string; status: string }[]
    >`select id, ticket_number, total, status from sales order by id desc limit ${limite}`;

    const conPagos = [];
    for (const venta of ventas) {
      const pagos = await sql<{ method: string; amount: string; reference: string | null }[]>`
        select method, amount, reference from sale_payments where sale_id = ${venta.id} order by id`;
      conPagos.push({ ...venta, pagos });
    }
    return conPagos;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Inserta una venta directamente, con la hora exacta que se le pida. Sirve para probar el
 * corte de día: por la interfaz no se puede vender «ayer a las 8 de la noche».
 */
export async function ventaFabricada(opciones: {
  username: string;
  shiftId: number;
  productId: number;
  cuando: Date;
  total: string;
  folio: string;
}): Promise<number> {
  const sql = conectar();
  try {
    const [usuario] = await sql<{ id: number; branch_id: number }[]>`
      select id, branch_id from users where username = ${opciones.username} limit 1`;
    if (!usuario) throw new Error(`No existe el usuario ${opciones.username}`);

    const token = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');

    const [venta] = await sql<{ id: number }[]>`
      insert into sales
        (ticket_number, public_token, user_id, branch_id, shift_id,
         subtotal, total, total_cost, profit, created_at)
      values
        (${opciones.folio}, ${token}, ${usuario.id}, ${usuario.branch_id}, ${opciones.shiftId},
         ${opciones.total}, ${opciones.total}, '0.00', ${opciones.total}, ${opciones.cuando})
      returning id`;
    if (!venta) throw new Error('No se pudo fabricar la venta');

    await sql`
      insert into sale_items
        (sale_id, product_id, product_name, quantity, unit_cost, unit_price, subtotal, profit)
      values
        (${venta.id}, ${opciones.productId}, 'Fabricado', '1.00', '0.00', ${opciones.total},
         ${opciones.total}, ${opciones.total})`;

    await sql`
      insert into sale_payments (sale_id, method, amount)
      values (${venta.id}, 'cash', ${opciones.total})`;

    return venta.id;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** El token público de una venta, para abrir su ticket. */
export async function tokenDeVenta(saleId: number): Promise<string> {
  const sql = conectar();
  try {
    const filas = await sql<{ public_token: string }[]>`
      select public_token from sales where id = ${saleId} limit 1`;
    const token = filas[0]?.public_token;
    if (!token) throw new Error(`La venta ${saleId} no existe`);
    return token;
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

/**
 * Borra lo que crean las pruebas de Recepción de Mercancía: recepciones de prueba (por
 * `referenceNote` o por el UUID fijo del fixture `cfdi-tony-ejemplo.xml`) y los pares
 * producto-proveedor que hayan quedado vinculados. `goods_receipt_items` se borra en
 * cascada al borrar `goods_receipts` (FK `onDelete: 'cascade'`).
 */
export async function limpiarRecepciones(): Promise<void> {
  const sql = conectar();
  try {
    await sql`
      delete from goods_receipts
      where reference_note like 'E2E%' or cfdi_uuid = '7A3B21F0-4C5D-4E9A-8B6F-1234567890AB'
    `;
    await sql`delete from product_suppliers where supplier_id in (select id from suppliers where rfc = 'STY850101AB1')`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Apaga la integración con la API de Claude (vía "foto" de Recepción de Mercancía), sin
 *  pasar por el modal — así cada prueba empieza con un estado conocido sin importar el
 *  orden en que corran. */
export async function desactivarIntegracionClaudeDB(): Promise<void> {
  const sql = conectar();
  try {
    await sql`update claude_integration set api_key = null where id = 1`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Limpia el límite por IP de la búsqueda pública de /imprimir, sin tocar el del PIN. */
export async function limpiarIntentosBusquedaPublica(): Promise<void> {
  const sql = conectar();
  try {
    await sql`delete from login_attempts where kind = 'busqueda_imagenes_publica'`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
