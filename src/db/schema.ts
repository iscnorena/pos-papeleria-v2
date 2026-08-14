import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
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
}));

export const inventoriesRelations = relations(inventories, ({ one }) => ({
  product: one(products, { fields: [inventories.productId], references: [products.id] }),
  branch: one(branches, { fields: [inventories.branchId], references: [branches.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
}));

export type Branch = typeof branches.$inferSelect;
export type User = typeof users.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inventory = typeof inventories.$inferSelect;
export type Rol = (typeof rolEnum.enumValues)[number];
