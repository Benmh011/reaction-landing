-- ─────────────────────────────────────────────────────────────
-- Tenure demo — catalogue row.
-- Run in the Neon SQL editor for the *reaction* database
-- (Vercel → reaction-landing → Storage → open database → SQL Editor).
-- Raw SQL only on this project: never `prisma migrate` / `db push`.
--
-- Confirm you're in the right database first — this must return the
-- existing rows, not "relation does not exist":
--     SELECT slug, "launchUrl" FROM "Demo";
--
-- Match launchUrl to however the provenance row is written (relative
-- path or full URL) so both behave the same on /demo.
-- ─────────────────────────────────────────────────────────────

INSERT INTO "Demo" ("id", "slug", "name", "description", "launchUrl", "accessNote", "active", "sortOrder")
VALUES (
  'demo_tenure_0001',
  'tenure',
  'Tenure — property management',
  'A practice system for a lettings and property management office. Compliance dates, tenancies, and the maintenance board in one place, ordered by what falls due next.',
  '/demos/tenure',
  'Sign in with an approved account. Set the user''s demo version to "tenure" in admin to grant access.',
  true,
  2
)
ON CONFLICT ("slug") DO UPDATE SET
  "name"        = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "launchUrl"   = EXCLUDED."launchUrl",
  "accessNote"  = EXCLUDED."accessNote",
  "active"      = EXCLUDED."active",
  "sortOrder"   = EXCLUDED."sortOrder",
  "updatedAt"   = CURRENT_TIMESTAMP;
