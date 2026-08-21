ALTER TYPE "public"."goods_receipt_source" ADD VALUE 'texto';--> statement-breakpoint
ALTER TYPE "public"."goods_receipt_source" ADD VALUE 'foto';--> statement-breakpoint
CREATE TABLE "claude_integration" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key" text,
	"updated_by_user_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claude_integration" ADD CONSTRAINT "claude_integration_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Fila única (id = 1): las acciones de la integración siempre leen/actualizan este id fijo.
-- api_key NULL = integración apagada (comportamiento por defecto).
INSERT INTO "claude_integration" ("id", "api_key") VALUES (1, NULL);