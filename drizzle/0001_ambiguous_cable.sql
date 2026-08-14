CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shift_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "cash_register_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"opening_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"expected_cash" numeric(12, 2),
	"actual_cash" numeric(12, 2),
	"difference" numeric(12, 2),
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"status" "shift_status" DEFAULT 'open' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folios" (
	"branch_id" integer NOT NULL,
	"date" date NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "folios_branch_id_date_pk" PRIMARY KEY("branch_id","date")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"public_token" text NOT NULL,
	"user_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"shift_id" integer NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_register_shifts" ADD CONSTRAINT "cash_register_shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_register_shifts" ADD CONSTRAINT "cash_register_shifts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folios" ADD CONSTRAINT "folios_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_shift_id_cash_register_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."cash_register_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_payments" ADD CONSTRAINT "shift_payments_shift_id_cash_register_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."cash_register_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shifts_user_status_idx" ON "cash_register_shifts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "shifts_branch_opened_idx" ON "cash_register_shifts" USING btree ("branch_id","opened_at");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_payments_sale_idx" ON "sale_payments" USING btree ("sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_ticket_number_unique" ON "sales" USING btree ("ticket_number");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_public_token_unique" ON "sales" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "sales_branch_created_idx" ON "sales" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_shift_idx" ON "sales" USING btree ("shift_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_payments_shift_method_unique" ON "shift_payments" USING btree ("shift_id","method");