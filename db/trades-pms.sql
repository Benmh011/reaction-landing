-- ─────────────────────────────────────────────────────────────
-- Trades PMS — per-login storage, and the catalogue row.
-- Run in the Neon SQL editor for the *reaction* database
-- (Vercel → reaction-landing → Storage → open database → SQL Editor).
-- Raw SQL only on this project: never `prisma migrate` / `db push`.
--
-- Confirm you're in the right database first — this must return the
-- existing rows (Articled's among them), not "relation does not exist":
--     SELECT slug, name, "launchUrl" FROM "Demo" ORDER BY "sortOrder";
--
-- Safe to run more than once. Nothing of Articled's is dropped or
-- changed: its tables and pages stay where they are, it simply stops
-- being listed, because its catalogue row now points at Trades PMS.
-- ─────────────────────────────────────────────────────────────

-- 1. One row per sign-in: that user's whole Trades PMS database file
--    (SQLite, gzip-compressed), with a version number that goes up by one
--    on every save so two open windows can never overwrite each other.
--    Deleting a user deletes their Trades PMS data with them.
CREATE TABLE IF NOT EXISTS "TradesPmsStore" (
  "userId"    TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "data"      BYTEA NOT NULL,
  "encoding"  TEXT NOT NULL DEFAULT 'none',
  "version"   INTEGER NOT NULL DEFAULT 1,
  "bytes"     INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. The catalogue row. Articled's row is pointed at Trades PMS and keeps
--    its slug on purpose: accounts approved for that row keep their access
--    and now open Trades PMS. The app grants access to whichever catalogue
--    row launches /demos/trades-pms, so nothing else needs changing.
--    This must report "UPDATE 1". If it reports anything else, stop: the
--    Articled row is not written the way this expects, so look at the rows
--    from the SELECT at the top and send them over.
UPDATE "Demo" SET
  "name"        = 'Trades PMS — practice management for trades',
  "description" = 'A practice system for gas, plumbing, electrical and building firms. Estimates with versions and sign-off, invoices and payments, gas safety records with due-date reminders, and VAT returns worked out for you.',
  "launchUrl"   = '/demos/trades-pms',
  "accessNote"  = 'Sign in with an approved account. Each sign-in has its own saved data.',
  "active"      = true,
  "updatedAt"   = CURRENT_TIMESTAMP
WHERE "slug" = 'articled'
   OR "launchUrl" LIKE '%/articled%'
   OR "launchUrl" = '/demos/trades-pms';

-- 3. Check. The first must show one row with the new name and
--    /demos/trades-pms, and no row still pointing at Articled. The second
--    must run without error (0 rows until somebody has used the app).
SELECT "slug", "name", "launchUrl", "active", "sortOrder" FROM "Demo" ORDER BY "sortOrder";
SELECT "userId", "version", "bytes", "encoding", "updatedAt" FROM "TradesPmsStore" ORDER BY "updatedAt" DESC;
