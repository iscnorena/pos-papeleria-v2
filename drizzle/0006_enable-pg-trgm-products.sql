-- Sugerencias por similitud de texto al emparejar líneas de Recepción de Mercancía sin
-- match (docs/modulo-recepcion-mercancia-xml.md) contra la Descripcion del CFDI. drizzle-kit
-- no gestiona extensiones de Postgres, así que va a mano.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "products_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops);
