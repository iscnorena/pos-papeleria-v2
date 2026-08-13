import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Fase 0: tabla de prueba, y nada más. Existe únicamente para verificar el criterio
// de aceptación «`npm run db:push` crea una tabla en Supabase».
//
// BORRAR EN FASE 1, cuando entren `branches`, `users` y `login_attempts` (§7).
export const healthCheck = pgTable('health_check', {
  id: serial('id').primaryKey(),
  note: text('note').notNull().default('fase 0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
