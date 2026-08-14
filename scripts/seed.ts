import { config as cargarEnv } from 'dotenv';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

cargarEnv({ path: '.env.local', quiet: true });
cargarEnv({ quiet: true });

// §9 — semilla idempotente que deja el sistema usable de inmediato. Se puede correr
// las veces que haga falta: busca por la columna única antes de insertar y nunca duplica.
//
// El catálogo (categorías y ~40 productos) se agrega aquí en la Fase 2, cuando existan
// esas tablas. Por ahora: sucursales y usuarios.

async function main() {
  // La semilla NO importa `src/db`: ese módulo lleva `server-only`, que revienta fuera del
  // servidor de Next — y quitarlo debilitaría la protección real que da en la aplicación.
  // Abre su propia conexión, corta y de un solo uso, con el mismo esquema.
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const postgres = (await import('postgres')).default;
  const { branches, users } = await import('../src/db/schema');

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL. Revisa .env.local.');

  const cliente = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(cliente, { schema: { branches, users } });

  const COSTO_BCRYPT = 12; // §5

  async function sucursal(nombre: string) {
    const [existente] = await db.select().from(branches).where(eq(branches.name, nombre)).limit(1);
    if (existente) return existente;
    const [creada] = await db.insert(branches).values({ name: nombre }).returning();
    if (!creada) throw new Error(`No se pudo crear la sucursal ${nombre}`);
    return creada;
  }

  async function usuario(datos: {
    name: string;
    username: string;
    pin: string;
    role: 'admin' | 'cajera';
    branchId: number;
  }) {
    const [existente] = await db
      .select()
      .from(users)
      .where(eq(users.username, datos.username))
      .limit(1);
    if (existente) return existente;

    const [creado] = await db
      .insert(users)
      .values({
        name: datos.name,
        username: datos.username,
        role: datos.role,
        branchId: datos.branchId,
        passwordHash: await bcrypt.hash('password', COSTO_BCRYPT),
        pinHash: await bcrypt.hash(datos.pin, COSTO_BCRYPT),
      })
      .returning();
    if (!creado) throw new Error(`No se pudo crear el usuario ${datos.username}`);
    return creado;
  }

  const principal = await sucursal('Principal');
  const segunda = await sucursal('Sucursal 2');

  await usuario({
    name: 'Administración',
    username: 'admin',
    pin: '1234',
    role: 'admin',
    branchId: principal.id,
  });
  await usuario({
    name: 'Cajera',
    username: 'cajera',
    pin: '5678',
    role: 'cajera',
    branchId: principal.id,
  });
  await usuario({
    name: 'María',
    username: 'maria',
    pin: '9012',
    role: 'cajera',
    branchId: segunda.id,
  });

  const sucursales = await db.select().from(branches);
  const usuarios = await db.select().from(users);
  console.log(`Sucursales: ${sucursales.map((s) => s.name).join(', ')}`);
  console.log(`Usuarios:   ${usuarios.map((u) => `${u.username} (${u.role})`).join(', ')}`);
  console.log('Contraseña de los tres: password');

  await cliente.end({ timeout: 5 });
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('La semilla falló:', error);
    process.exit(1);
  });
