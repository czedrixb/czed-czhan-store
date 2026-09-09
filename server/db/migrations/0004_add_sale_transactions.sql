CREATE TABLE "sale_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_key" text,
	"cash_received" integer,
	"change_due" integer,
	"revenue" integer NOT NULL,
	"profit" integer NOT NULL,
	"voided_at" timestamp with time zone,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"legacy_sale_id" integer
);
--> statement-breakpoint
INSERT INTO "sale_transactions" ("legacy_sale_id", "submission_key", "cash_received", "change_due", "revenue", "profit", "sold_at", "voided_at", "created_at")
SELECT "id", "submission_key", "cash_received", "change_due", "revenue", "profit", "sold_at", "voided_at", "created_at" FROM "sales";
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "transaction_id" integer;
--> statement-breakpoint
UPDATE "sales" s SET "transaction_id" = t."id" FROM "sale_transactions" t WHERE t."legacy_sale_id" = s."id";
--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "transaction_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "sale_transactions" DROP COLUMN "legacy_sale_id";
--> statement-breakpoint
DROP INDEX "sales_submission_key_unique";
--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "cash_received";
--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "change_due";
--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "submission_key";
--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "voided_at";
--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "sold_at";
--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_transaction_id_sale_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."sale_transactions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "sale_transactions_submission_key_unique" ON "sale_transactions" USING btree ("submission_key");
