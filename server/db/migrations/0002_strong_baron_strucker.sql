ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'MEMBER' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: every existing row just landed on MEMBER, which would leave an
-- installed store with zero admins. Promote the oldest account (in every real
-- deployment, the env-bootstrapped owner created on first boot) to ADMIN.
-- The bootstrap plugin (server/plugins/migrate.ts) re-pins that same account
-- to ADMIN on every boot going forward, so this is a one-time convenience for
-- instances where STORE_PASSWORD_HASH happens to be unset.
UPDATE "users" SET "role" = 'ADMIN'
WHERE "id" = (SELECT MIN("id") FROM "users")
  AND NOT EXISTS (SELECT 1 FROM "users" WHERE "role" = 'ADMIN');