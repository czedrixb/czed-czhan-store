ALTER TABLE "sales" ADD COLUMN "cash_received" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "change_due" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "submission_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_submission_key_unique" ON "sales" USING btree ("submission_key");