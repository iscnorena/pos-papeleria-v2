CREATE TYPE "public"."goods_receipt_item_match_status" AS ENUM('matched_auto', 'matched_manual', 'created_new', 'unmatched');--> statement-breakpoint
CREATE TYPE "public"."goods_receipt_source" AS ENUM('xml', 'manual');--> statement-breakpoint
CREATE TYPE "public"."goods_receipt_status" AS ENUM('draft', 'authorized', 'discarded');--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" integer NOT NULL,
	"product_id" integer,
	"supplier_code" text,
	"description" text NOT NULL,
	"sat_product_key" text,
	"unit_key" text,
	"unit_label" text,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"match_status" "goods_receipt_item_match_status" DEFAULT 'unmatched' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "goods_receipt_source" NOT NULL,
	"status" "goods_receipt_status" DEFAULT 'draft' NOT NULL,
	"supplier_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"cfdi_uuid" text,
	"cfdi_series" text,
	"cfdi_folio" text,
	"cfdi_issued_at" timestamp with time zone,
	"cfdi_stamped_at" timestamp with time zone,
	"reference_note" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"authorized_by_user_id" integer,
	"authorized_at" timestamp with time zone,
	"discarded_by_user_id" integer,
	"discarded_at" timestamp with time zone,
	"discard_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_code" text NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"last_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_cost_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rfc" text,
	"contact_name" text,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_authorized_by_user_id_users_id_fk" FOREIGN KEY ("authorized_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_discarded_by_user_id_users_id_fk" FOREIGN KEY ("discarded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goods_receipt_items_receipt_idx" ON "goods_receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "goods_receipt_items_product_idx" ON "goods_receipt_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "goods_receipts_status_idx" ON "goods_receipts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goods_receipts_supplier_idx" ON "goods_receipts" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "goods_receipts_branch_created_idx" ON "goods_receipts" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_suppliers_supplier_code_unique" ON "product_suppliers" USING btree ("supplier_id","supplier_code");--> statement-breakpoint
CREATE INDEX "product_suppliers_product_idx" ON "product_suppliers" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_rfc_unique" ON "suppliers" USING btree ("rfc");--> statement-breakpoint
CREATE INDEX "suppliers_active_name_idx" ON "suppliers" USING btree ("is_active","name");--> statement-breakpoint
-- Índice único PARCIAL, no declarado en schema.ts (Drizzle no soporta predicado parcial de
-- forma nativa): al descartar una recepción el UUID debe liberarse para poder reimportar la
-- misma factura, pero la fila descartada conserva su UUID como rastro de auditoría. Un
-- uniqueIndex normal bloquearía esa reimportación.
CREATE UNIQUE INDEX "goods_receipts_cfdi_uuid_unique" ON "goods_receipts" USING btree ("cfdi_uuid") WHERE "goods_receipts"."status" <> 'discarded';