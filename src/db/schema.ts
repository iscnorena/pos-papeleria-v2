import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Modelo de datos de §7. Los identificadores van en inglés (tablas y columnas) para no
// mezclar idiomas dentro de la capa de base de datos; la interfaz va en español.
//
// La tabla `health_check` de la Fase 0 se borró aquí: existía solo para probar `db:push`.

export const rolEnum = pgEnum('user_role', ['admin', 'cajera']);

/** Marcas de tiempo comunes. Todo `timestamptz` en UTC (§2). */
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  // Adónde llegan los pedidos de /kit/acomoda-impresion (Acomoda Impresión pública). Sin signos ni
  // espacios: es el número que arma el link `wa.me`.
  whatsappNumber: text('whatsapp_number'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    username: text('username').notNull(),
    email: text('email'),
    passwordHash: text('password_hash').notNull(),
    // El PIN es opcional: un usuario puede existir solo con contraseña.
    pinHash: text('pin_hash'),
    role: rolEnum('role').notNull().default('cajera'),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_username_unique').on(t.username),
    index('users_branch_active_idx').on(t.branchId, t.isActive),
  ],
);

// §5: los intentos fallidos se guardan en la base, no en memoria, porque cada request
// puede caer en una instancia distinta (§1.1) y un contador en memoria no limitaría nada.
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: serial('id').primaryKey(),
    ip: text('ip').notNull(),
    kind: text('kind').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_attempts_ip_time_idx').on(t.ip, t.kind, t.attemptedAt)],
);

// Qué herramientas del registro (`src/tools/registry.ts` y `src/tools/pdf/registro.ts`)
// están visibles en /kit sin sesión. El `id` es el mismo que usa el registro (ej.
// 'rifas', 'pdf-unir'); si una herramienta no tiene fila aquí, se trata como privada
// (`isPublic` por defecto `false`) — el checkbox de cada pantalla la da de alta al
// prenderla la primera vez.
export const toolSettings = pgTable('tool_settings', {
  id: text('id').primaryKey(),
  isPublic: boolean('is_public').notNull().default(false),
  ...timestamps,
});

export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code'),
    // Si se borra la categoría, el producto sobrevive sin ella: perder el producto por
    // reorganizar el catálogo sería absurdo.
    categoryId: integer('category_id').references(() => productCategories.id, {
      onDelete: 'set null',
    }),
    // Dinero en `numeric(12,2)` (§2). En TypeScript se opera en centavos enteros; la
    // conversión ocurre solo en las dos fronteras, al leer y al escribir.
    costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0'),
    salePrice: numeric('sale_price', { precision: 12, scale: 2 }).notNull().default('0'),
    managesInventory: boolean('manages_inventory').notNull().default(true),
    // El cajero teclea el importe al cobrarlo (impresión a color, etc.); `salePrice` se
    // ignora para estos productos.
    openPrice: boolean('open_price').notNull().default(false),
    expiryDate: date('expiry_date'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('products_active_name_idx').on(t.isActive, t.name),
    index('products_code_idx').on(t.code),
  ],
);

export const inventories = pgTable(
  'inventories',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    stock: numeric('stock', { precision: 12, scale: 2 }).notNull().default('0'),
    physicalLocation: text('physical_location'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('inventories_product_branch_unique').on(t.productId, t.branchId),
    index('inventories_branch_idx').on(t.branchId),
  ],
);

export const shiftStatusEnum = pgEnum('shift_status', ['open', 'closed']);
export const saleStatusEnum = pgEnum('sale_status', ['completed', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'transfer']);

// Recepción de Mercancía (docs/modulo-recepcion-mercancia-xml.md). `source` distingue si
// la recepción se generó importando un CFDI XML o capturando líneas a mano; ambas vías
// comparten el mismo modelo de cabecera + líneas.
// 'texto' = texto pegado a mano (el usuario le pidió a Claude, fuera del sistema, que
// leyera la foto de un ticket). 'foto' = imagen subida aquí mismo y procesada por la API
// de Claude (integración opcional, ver `claudeIntegration` más abajo).
export const goodsReceiptSourceEnum = pgEnum('goods_receipt_source', [
  'xml',
  'manual',
  'texto',
  'foto',
]);
export const goodsReceiptStatusEnum = pgEnum('goods_receipt_status', [
  'draft',
  'authorized',
  'discarded',
]);
export const goodsReceiptItemMatchStatusEnum = pgEnum('goods_receipt_item_match_status', [
  'matched_auto',
  'matched_manual',
  'created_new',
  'unmatched',
]);

export const cashRegisterShifts = pgTable(
  'cash_register_shifts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id),
    openingAmount: numeric('opening_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    // Los tres se llenan al cerrar y quedan congelados: el corte no debe depender de
    // recalcular ventas históricas (§7.5).
    expectedCash: numeric('expected_cash', { precision: 12, scale: 2 }),
    actualCash: numeric('actual_cash', { precision: 12, scale: 2 }),
    difference: numeric('difference', { precision: 12, scale: 2 }),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    status: shiftStatusEnum('status').notNull().default('open'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    index('shifts_user_status_idx').on(t.userId, t.status),
    index('shifts_branch_opened_idx').on(t.branchId, t.openedAt),
  ],
);

export const sales = pgTable(
  'sales',
  {
    id: serial('id').primaryKey(),
    ticketNumber: text('ticket_number').notNull(),
    // Token opaco de 32 bytes para compartir el ticket sin cuenta (§6). NUNCA el id.
    publicToken: text('public_token').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id),
    shiftId: integer('shift_id')
      .notNull()
      .references(() => cashRegisterShifts.id),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    tax: numeric('tax', { precision: 12, scale: 2 }).notNull().default('0'),
    discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    totalCost: numeric('total_cost', { precision: 12, scale: 2 }).notNull().default('0'),
    profit: numeric('profit', { precision: 12, scale: 2 }).notNull().default('0'),
    status: saleStatusEnum('status').notNull().default('completed'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('sales_ticket_number_unique').on(t.ticketNumber),
    uniqueIndex('sales_public_token_unique').on(t.publicToken),
    index('sales_branch_created_idx').on(t.branchId, t.createdAt),
    index('sales_shift_idx').on(t.shiftId),
  ],
);

export const saleItems = pgTable(
  'sale_items',
  {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    // Obligatorio HOY, a propósito. §6 prevé permitirlo nulo cuando las Herramientas
    // cobren servicios sin producto asociado, pero manda dejar esa migración anotada y
    // no hacerla todavía. Está en la deuda de `docs/estado.md`.
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    // `product_name` y `unit_cost` se COPIAN al vender (§7.2): si mañana cambia el precio
    // o el nombre del producto, el ticket viejo no debe cambiar.
    productName: text('product_name').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull().default('0'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
    discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    profit: numeric('profit', { precision: 12, scale: 2 }).notNull().default('0'),
    ...timestamps,
  },
  (t) => [index('sale_items_sale_idx').on(t.saleId)],
);

export const salePayments = pgTable(
  'sale_payments',
  {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    method: paymentMethodEnum('method').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    reference: text('reference'),
    ...timestamps,
  },
  (t) => [index('sale_payments_sale_idx').on(t.saleId)],
);

export const shiftPayments = pgTable(
  'shift_payments',
  {
    id: serial('id').primaryKey(),
    shiftId: integer('shift_id')
      .notNull()
      .references(() => cashRegisterShifts.id, { onDelete: 'cascade' }),
    method: paymentMethodEnum('method').notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    transactionCount: integer('transaction_count').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('shift_payments_shift_method_unique').on(t.shiftId, t.method)],
);

// §7.3 — el contador de folios vive aquí y se incrementa de forma atómica dentro de la
// transacción de la venta. Contar ventas existentes se rompe en serverless: dos cajas en
// instancias distintas leerían el mismo último folio.
export const folios = pgTable(
  'folios',
  {
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    lastNumber: integer('last_number').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.date] })],
);

export const suppliers = pgTable(
  'suppliers',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    // RFC del emisor del CFDI. Se usa para validar que el emisor de un XML importado
    // corresponda a un proveedor ya configurado (§ Requerimientos funcionales, validación 3).
    rfc: text('rfc'),
    contactName: text('contact_name'),
    phone: text('phone'),
    email: text('email'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('suppliers_rfc_unique').on(t.rfc),
    index('suppliers_active_name_idx').on(t.isActive, t.name),
  ],
);

// Costo y código de un producto SEGÚN un proveedor específico. La clave real de
// emparejamiento con las líneas de un CFDI es (supplierId, supplierCode) — el
// `NoIdentificacion` de Tony u homólogo de otro proveedor — porque un mismo código puede
// repetirse entre proveedores distintos sin confundirse. Deliberadamente NO hay unique en
// (productId, supplierId): si el proveedor cambia de código para el mismo producto, debe
// poder existir una fila nueva sin romper la anterior.
export const productSuppliers = pgTable(
  'product_suppliers',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'cascade' }),
    supplierCode: text('supplier_code').notNull(),
    // Solo una fila por producto debería tener `true`; eso se garantiza a nivel de
    // aplicación (transacción que apaga las demás del mismo producto), no con un índice.
    isPreferred: boolean('is_preferred').notNull().default(false),
    lastCost: numeric('last_cost', { precision: 12, scale: 2 }).notNull().default('0'),
    lastCostAt: timestamp('last_cost_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('product_suppliers_supplier_code_unique').on(t.supplierId, t.supplierCode),
    index('product_suppliers_product_idx').on(t.productId),
  ],
);

// Cabecera de una recepción de mercancía: la pre-carga (borrador) que un usuario revisa y
// autoriza antes de que se toque el inventario. Los campos `cfdi*` quedan nulos cuando
// `source = 'manual'`.
//
// La unicidad del UUID NO se declara aquí como `uniqueIndex` normal: al descartar una
// recepción el UUID debe quedar libre para reimportarse, pero la fila descartada conserva
// su UUID como rastro de auditoría. Eso exige un índice único PARCIAL
// (`WHERE status <> 'discarded'`), que se agrega a mano en la migración SQL — ver
// `drizzle/`. Un `uniqueIndex` de Drizzle no soporta ese predicado.
export const goodsReceipts = pgTable(
  'goods_receipts',
  {
    id: serial('id').primaryKey(),
    source: goodsReceiptSourceEnum('source').notNull(),
    status: goodsReceiptStatusEnum('status').notNull().default('draft'),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id),
    cfdiUuid: text('cfdi_uuid'),
    cfdiSeries: text('cfdi_series'),
    cfdiFolio: text('cfdi_folio'),
    cfdiIssuedAt: timestamp('cfdi_issued_at', { withTimezone: true }),
    cfdiStampedAt: timestamp('cfdi_stamped_at', { withTimezone: true }),
    referenceNote: text('reference_note'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    tax: numeric('tax', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    createdByUserId: integer('created_by_user_id')
      .notNull()
      .references(() => users.id),
    authorizedByUserId: integer('authorized_by_user_id').references(() => users.id),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }),
    discardedByUserId: integer('discarded_by_user_id').references(() => users.id),
    discardedAt: timestamp('discarded_at', { withTimezone: true }),
    discardReason: text('discard_reason'),
    ...timestamps,
  },
  (t) => [
    index('goods_receipts_status_idx').on(t.status),
    index('goods_receipts_supplier_idx').on(t.supplierId),
    index('goods_receipts_branch_created_idx').on(t.branchId, t.createdAt),
  ],
);

// Líneas de una recepción. Sin unique en (receiptId, supplierCode): una factura real puede
// repetir el mismo NoIdentificacion en dos conceptos distintos (caso borde explícito de la
// spec), y ambas líneas deben poder coexistir y sumar stock por separado al autorizar.
export const goodsReceiptItems = pgTable(
  'goods_receipt_items',
  {
    id: serial('id').primaryKey(),
    receiptId: integer('receipt_id')
      .notNull()
      .references(() => goodsReceipts.id, { onDelete: 'cascade' }),
    // Nulo = línea sin resolver. No se puede autorizar la recepción con líneas así.
    productId: integer('product_id').references(() => products.id),
    supplierCode: text('supplier_code'),
    description: text('description').notNull(),
    // ClaveProdServ del CFDI: clasificación fiscal SAT, puramente informativa. NUNCA se usa
    // para emparejar contra el catálogo (eso es `supplierCode`).
    satProductKey: text('sat_product_key'),
    unitKey: text('unit_key'),
    unitLabel: text('unit_label'),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    matchStatus: goodsReceiptItemMatchStatusEnum('match_status').notNull().default('unmatched'),
    ...timestamps,
  },
  (t) => [
    index('goods_receipt_items_receipt_idx').on(t.receiptId),
    index('goods_receipt_items_product_idx').on(t.productId),
  ],
);

// Integración opcional con la API de Claude para leer fotos de tickets (recepción de
// mercancía, vía "foto"). Fila única (id = 1, sembrada en la migración). `apiKey` en
// texto plano deliberadamente: app de un solo negocio, admin-only, mismo nivel de
// confianza que ya tienen otros datos de esta base (RFC, WhatsApp de sucursal). `null` =
// integración apagada; la acción que la lee para la UI nunca expone el valor, solo si
// está o no configurada.
export const claudeIntegration = pgTable('claude_integration', {
  id: serial('id').primaryKey(),
  apiKey: text('api_key'),
  updatedByUserId: integer('updated_by_user_id').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  inventories: many(inventories),
}));

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  inventories: many(inventories),
  productSuppliers: many(productSuppliers),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  productSuppliers: many(productSuppliers),
  goodsReceipts: many(goodsReceipts),
}));

export const productSuppliersRelations = relations(productSuppliers, ({ one }) => ({
  product: one(products, { fields: [productSuppliers.productId], references: [products.id] }),
  supplier: one(suppliers, { fields: [productSuppliers.supplierId], references: [suppliers.id] }),
}));

export const goodsReceiptsRelations = relations(goodsReceipts, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [goodsReceipts.supplierId], references: [suppliers.id] }),
  branch: one(branches, { fields: [goodsReceipts.branchId], references: [branches.id] }),
  createdBy: one(users, { fields: [goodsReceipts.createdByUserId], references: [users.id] }),
  authorizedBy: one(users, {
    fields: [goodsReceipts.authorizedByUserId],
    references: [users.id],
  }),
  items: many(goodsReceiptItems),
}));

export const goodsReceiptItemsRelations = relations(goodsReceiptItems, ({ one }) => ({
  receipt: one(goodsReceipts, {
    fields: [goodsReceiptItems.receiptId],
    references: [goodsReceipts.id],
  }),
  product: one(products, { fields: [goodsReceiptItems.productId], references: [products.id] }),
}));

export const inventoriesRelations = relations(inventories, ({ one }) => ({
  product: one(products, { fields: [inventories.productId], references: [products.id] }),
  branch: one(branches, { fields: [inventories.branchId], references: [branches.id] }),
}));

export const cashRegisterShiftsRelations = relations(cashRegisterShifts, ({ one, many }) => ({
  user: one(users, { fields: [cashRegisterShifts.userId], references: [users.id] }),
  branch: one(branches, { fields: [cashRegisterShifts.branchId], references: [branches.id] }),
  sales: many(sales),
  payments: many(shiftPayments),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  user: one(users, { fields: [sales.userId], references: [users.id] }),
  branch: one(branches, { fields: [sales.branchId], references: [branches.id] }),
  shift: one(cashRegisterShifts, {
    fields: [sales.shiftId],
    references: [cashRegisterShifts.id],
  }),
  items: many(saleItems),
  payments: many(salePayments),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const salePaymentsRelations = relations(salePayments, ({ one }) => ({
  sale: one(sales, { fields: [salePayments.saleId], references: [sales.id] }),
}));

export const shiftPaymentsRelations = relations(shiftPayments, ({ one }) => ({
  shift: one(cashRegisterShifts, {
    fields: [shiftPayments.shiftId],
    references: [cashRegisterShifts.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
}));

export type Branch = typeof branches.$inferSelect;
export type User = typeof users.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inventory = typeof inventories.$inferSelect;
export type CashRegisterShift = typeof cashRegisterShifts.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type SalePayment = typeof salePayments.$inferSelect;
export type ShiftPayment = typeof shiftPayments.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type ProductSupplier = typeof productSuppliers.$inferSelect;
export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
export type GoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;
export type Rol = (typeof rolEnum.enumValues)[number];
export type EstadoTurno = (typeof shiftStatusEnum.enumValues)[number];
export type EstadoVenta = (typeof saleStatusEnum.enumValues)[number];
export type OrigenRecepcion = (typeof goodsReceiptSourceEnum.enumValues)[number];
export type EstadoRecepcion = (typeof goodsReceiptStatusEnum.enumValues)[number];
export type EstadoEmparejamientoLinea = (typeof goodsReceiptItemMatchStatusEnum.enumValues)[number];
