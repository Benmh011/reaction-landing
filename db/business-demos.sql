-- ─────────────────────────────────────────────────────────────
-- Business demo rework — run ONCE in the Neon SQL editor.
-- Raw SQL only on this project: never `prisma migrate` / `db push`.
-- Every statement is idempotent except the DELETEs (which are the point).
-- ─────────────────────────────────────────────────────────────

-- 1) The demo catalogue table
CREATE TABLE IF NOT EXISTS "Demo" (
  "id"          TEXT PRIMARY KEY,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "slug"        TEXT NOT NULL UNIQUE,
  "name"        TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "launchUrl"   TEXT NOT NULL,
  "accessNote"  TEXT,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "Demo_active_sortOrder_idx" ON "Demo" ("active", "sortOrder");

-- 2) Business request type + sector column
ALTER TYPE "RequestType" ADD VALUE IF NOT EXISTS 'BUSINESS';
ALTER TABLE "DemoRequest" ADD COLUMN IF NOT EXISTS "sector" TEXT;
ALTER TABLE "DemoRequest" ALTER COLUMN "requestType" SET DEFAULT 'BUSINESS';
ALTER TABLE "User"        ALTER COLUMN "requestType" SET DEFAULT 'BUSINESS';

-- 3) Seed the first demo: the Southmoor Vets clinical assistant.
--    Access is gated by the software's own login wall on
--    reactionbusinessservices.co.uk — the same credentials already in use.
--    (accessNote deliberately does not contain the password; keep that in
--    your password manager and note only where to find it.)
INSERT INTO "Demo" ("id", "slug", "name", "description", "launchUrl", "accessNote", "active", "sortOrder")
VALUES (
  gen_random_uuid()::text,
  'southmoor-vets',
  'Southmoor Vets — Clinical Assistant',
  'A locally hosted multi-agentic assistant for a working veterinary practice: grounded clinical answers with verified SPC citations, client files, a working-day board, and document search — all inside the practice''s own walls.',
  'https://reactionbusinessservices.co.uk/southmoor',
  'Gated by the software''s own login wall. Uses the existing Southmoor demo account (see password manager).',
  true,
  0
)
ON CONFLICT ("slug") DO NOTHING;

-- 4) Remove every user account except ours.
--    Sessions, OAuth accounts, and all pilot data cascade automatically;
--    DemoRequest.approvedUserId detaches to NULL.
DELETE FROM "User" WHERE lower("email") <> 'info@reaction.org.uk';

-- Clear any pending magic-link tokens for removed accounts
DELETE FROM "VerificationToken";

-- 5) OPTIONAL — the old university-era demo request leads.
--    Uncomment to wipe them; leave commented to keep them as records.
-- DELETE FROM "DemoRequest";

-- 6) Sanity checks — run these after; expect 1 user (ours) and 1 demo.
-- SELECT email, role FROM "User";
-- SELECT slug, name, active FROM "Demo";
