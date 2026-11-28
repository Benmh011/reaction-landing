-- ─────────────────────────────────────────────────────────────
-- The managing door (/api/manage) — ONLY NEEDED IF THE PMS SAYS SO.
--
-- The door uses tables this site already has. Run this in the Neon SQL
-- editor only if "Check the connection" in the PMS reports that the opt-out
-- list, or the mark on accounts that have opted out, could not be read.
-- That would mean the two things below were never made in this database.
--
-- Raw SQL only on this project: never `prisma migrate` / `db push`.
-- Both statements are idempotent: running them when everything is already
-- there changes nothing.
-- ─────────────────────────────────────────────────────────────

-- 1) The opt-out list: every address that has unsubscribed from news and offers.
CREATE TABLE IF NOT EXISTS "EmailOptOut" (
  "email"      TEXT PRIMARY KEY,
  "optedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) The mark on an account that has unsubscribed.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "marketingOptOut" BOOLEAN NOT NULL DEFAULT false;
