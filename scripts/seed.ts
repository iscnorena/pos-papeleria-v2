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
  const { branches, users, productCategories, products, inventories, suppliers } =
    await import('../src/db/schema');

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL. Revisa .env.local.');

  const cliente = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(cliente, {
    schema: { branches, users, productCategories, products, inventories, suppliers },
  });

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

  // Sin un número de WhatsApp en al menos una sucursal, el botón "Enviar por WhatsApp" de
  // /imprimir/* nunca aparece (src/app/imprimir/rifas/page.tsx y hermanas exigen
  // `isNotNull(branches.whatsappNumber)`) — la suite de e2e lo da por hecho.
  if (!principal.whatsappNumber) {
    await db
      .update(branches)
      .set({ whatsappNumber: '527445008175' })
      .where(eq(branches.id, principal.id));
  }

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

  // ── Catálogo (§9) ────────────────────────────────────────────────────────────────
  // Costos y precios con margen de 30 a 60%, en pesos y con dos decimales, que es como
  // los guarda Postgres. Nada de flotantes: son cadenas hasta llegar a la columna.

  async function categoria(name: string) {
    const [existente] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.name, name))
      .limit(1);
    if (existente) return existente;
    const [creada] = await db.insert(productCategories).values({ name }).returning();
    if (!creada) throw new Error(`No se pudo crear la categoría ${name}`);
    return creada;
  }

  const CATEGORIAS = [
    'Cuadernos',
    'Escritura',
    'Papel',
    'Escolar',
    'Oficina',
    'Arte',
    'Impresión',
  ] as const;

  const idsCategoria = new Map<string, number>();
  for (const nombre of CATEGORIAS) {
    idsCategoria.set(nombre, (await categoria(nombre)).id);
  }

  // [nombre, código, categoría, costo, precio]
  const CATALOGO: Array<[string, string, (typeof CATEGORIAS)[number], string, string]> = [
    ['Cuaderno profesional raya 100 hojas', 'CUA-001', 'Cuadernos', '18.00', '28.00'],
    ['Cuaderno profesional cuadro chico 100 hojas', 'CUA-002', 'Cuadernos', '18.00', '28.00'],
    ['Cuaderno cosido italiano 96 hojas', 'CUA-003', 'Cuadernos', '22.00', '34.00'],
    ['Libreta profesional pasta dura', 'CUA-004', 'Cuadernos', '45.00', '69.00'],
    ['Block de notas adhesivas 3x3', 'CUA-005', 'Cuadernos', '12.00', '19.00'],
    ['Cuaderno forma francesa 100 hojas', 'CUA-006', 'Cuadernos', '16.00', '25.00'],
    ['Bolígrafo tinta negra', 'ESC-001', 'Escritura', '3.50', '6.00'],
    ['Bolígrafo tinta azul', 'ESC-002', 'Escritura', '3.50', '6.00'],
    ['Bolígrafo tinta roja', 'ESC-003', 'Escritura', '3.50', '6.00'],
    ['Lápiz del número 2', 'ESC-004', 'Escritura', '2.50', '4.00'],
    ['Marcador permanente negro', 'ESC-005', 'Escritura', '14.00', '22.00'],
    ['Marcatextos amarillo', 'ESC-006', 'Escritura', '9.00', '15.00'],
    ['Pluma de gel 0.7 negra', 'ESC-007', 'Escritura', '8.00', '13.00'],
    ['Corrector líquido', 'ESC-008', 'Escritura', '11.00', '18.00'],
    ['Goma de borrar blanca', 'ESC-009', 'Escritura', '2.00', '4.00'],
    ['Sacapuntas metálico', 'ESC-010', 'Escritura', '4.00', '7.00'],
    ['Paquete de hojas blancas carta 500', 'PAP-001', 'Papel', '95.00', '139.00'],
    ['Paquete de hojas blancas oficio 500', 'PAP-002', 'Papel', '115.00', '169.00'],
    ['Papel bond de color carta 100', 'PAP-003', 'Papel', '38.00', '58.00'],
    ['Cartulina blanca', 'PAP-004', 'Papel', '6.00', '10.00'],
    ['Papel lustre', 'PAP-005', 'Papel', '4.00', '7.00'],
    ['Papel china', 'PAP-006', 'Papel', '2.00', '4.00'],
    ['Mochila escolar mediana', 'ESO-001', 'Escolar', '180.00', '279.00'],
    ['Juego de geometría', 'ESO-002', 'Escolar', '25.00', '39.00'],
    ['Tijeras escolares punta roma', 'ESO-003', 'Escolar', '14.00', '23.00'],
    ['Pegamento en barra 21g', 'ESO-004', 'Escolar', '12.00', '19.00'],
    ['Resistol blanco 100ml', 'ESO-005', 'Escolar', '15.00', '24.00'],
    ['Compás escolar', 'ESO-006', 'Escolar', '20.00', '32.00'],
    ['Engrapadora de escritorio', 'OFI-001', 'Oficina', '85.00', '129.00'],
    ['Caja de grapas estándar', 'OFI-002', 'Oficina', '12.00', '20.00'],
    ['Perforadora de dos orificios', 'OFI-003', 'Oficina', '95.00', '145.00'],
    ['Carpeta de argollas 1 pulgada', 'OFI-004', 'Oficina', '42.00', '65.00'],
    ['Folder tamaño carta', 'OFI-005', 'Oficina', '2.50', '4.00'],
    ['Caja de clips número 1', 'OFI-006', 'Oficina', '9.00', '15.00'],
    ['Cinta adhesiva transparente', 'OFI-007', 'Oficina', '10.00', '17.00'],
    ['Colores de madera 12 piezas', 'ART-001', 'Arte', '48.00', '75.00'],
    ['Plumones de colores 12 piezas', 'ART-002', 'Arte', '52.00', '82.00'],
    ['Acuarelas 12 pastillas', 'ART-003', 'Arte', '38.00', '59.00'],
    ['Pincel escolar número 6', 'ART-004', 'Arte', '8.00', '14.00'],
    ['Plastilina 10 barras', 'ART-005', 'Arte', '22.00', '35.00'],
  ];

  // La impresión se cobra como servicio: no maneja inventario.
  const SERVICIOS: Array<[string, string, (typeof CATEGORIAS)[number], string, string]> = [
    ['Impresión blanco y negro', 'IMP-001', 'Impresión', '0.40', '1.00'],
    ['Impresión a color', 'IMP-002', 'Impresión', '3.00', '5.00'],
    ['Copia fotostática', 'IMP-003', 'Impresión', '0.30', '1.00'],
    ['Engargolado hasta 100 hojas', 'IMP-004', 'Impresión', '12.00', '25.00'],
    ['Enmicado tamaño carta', 'IMP-005', 'Impresión', '8.00', '18.00'],
  ];

  const sucursalesCreadas = await db.select().from(branches);

  async function producto(
    [name, code, cat, costPrice, salePrice]: (typeof CATALOGO)[number],
    managesInventory: boolean,
    stockInicial: string,
  ) {
    const [existente] = await db.select().from(products).where(eq(products.code, code)).limit(1);
    const categoryId = idsCategoria.get(cat) ?? null;

    const fila =
      existente ??
      (
        await db
          .insert(products)
          .values({ name, code, categoryId, costPrice, salePrice, managesInventory })
          .returning()
      )[0];
    if (!fila) throw new Error(`No se pudo crear el producto ${code}`);

    if (managesInventory) {
      // Existencia inicial en AMBAS sucursales. `onConflictDoNothing` mantiene la semilla
      // idempotente sin pisar un ajuste manual posterior.
      await db
        .insert(inventories)
        .values(
          sucursalesCreadas.map((s) => ({
            productId: fila.id,
            branchId: s.id,
            stock: stockInicial,
          })),
        )
        .onConflictDoNothing();
    }
    return fila;
  }

  for (const entrada of CATALOGO) await producto(entrada, true, '25.00');
  for (const entrada of SERVICIOS) await producto(entrada, false, '0.00');

  // ── Recepción de Mercancía (docs/modulo-recepcion-mercancia-xml.md) ────────────────
  // RFC igual al del fixture de prueba (src/lib/cfdi/fixtures/cfdi-tony-ejemplo.xml), para
  // que importar ese XML en local empareje con este proveedor sin configuración extra.
  async function proveedor(name: string, rfc: string) {
    const [existente] = await db.select().from(suppliers).where(eq(suppliers.rfc, rfc)).limit(1);
    if (existente) return existente;
    const [creado] = await db.insert(suppliers).values({ name, rfc }).returning();
    if (!creado) throw new Error(`No se pudo crear el proveedor ${name}`);
    return creado;
  }

  await proveedor('Super Papelerías Tony', 'STY850101AB1');

  const sucursales = await db.select().from(branches);
  const usuarios = await db.select().from(users);
  const catalogo = await db.select().from(products);
  const existencias = await db.select().from(inventories);
  console.log(`Categorías: ${CATEGORIAS.length}`);
  console.log(`Productos:  ${catalogo.length} (${existencias.length} filas de inventario)`);
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
