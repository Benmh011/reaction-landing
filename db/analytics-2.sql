-- Analytics, part 2: which mailing a visit came from, and button clicks.
-- Run the whole of this ONCE against the Neon database (SQL editor or psql),
-- before or after the deploy: the site works either way, and starts recording
-- the two new things as soon as this has been run.
-- Do NOT use `prisma migrate` / `prisma db push` on this project — raw SQL only.
-- Safe to re-run: every statement is IF NOT EXISTS.

-- The tag on a link from a mailing (?m=...), kept on the page view it arrived on.
ALTER TABLE "PageView" ADD COLUMN IF NOT EXISTS "campaign" TEXT;
CREATE INDEX IF NOT EXISTS "PageView_campaign_idx" ON "PageView" ("campaign") WHERE "campaign" IS NOT NULL;

-- A button or contact link pressed: what it said, where it led, which page it was on.
CREATE TABLE IF NOT EXISTS "SiteEvent" (
  "id"        TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name"      TEXT NOT NULL,
  "target"    TEXT,
  "path"      TEXT,
  "sessionId" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "SiteEvent_createdAt_idx" ON "SiteEvent" ("createdAt");
CREATE INDEX IF NOT EXISTS "SiteEvent_name_idx"      ON "SiteEvent" ("name");
