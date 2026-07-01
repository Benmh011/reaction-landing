-- Analytics tables for the Reaction /analytics dashboard.
-- Run this ONCE against your Neon database (SQL editor or psql).
-- Do NOT use `prisma migrate` / `prisma db push` on this project — raw SQL only.
-- Safe to re-run: every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "PageView" (
  "id"        TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "path"      TEXT NOT NULL,
  "referrer"  TEXT,
  "sessionId" TEXT NOT NULL,
  "country"   TEXT,
  "device"    TEXT
);
CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView" ("createdAt");
CREATE INDEX IF NOT EXISTS "PageView_sessionId_idx" ON "PageView" ("sessionId");
CREATE INDEX IF NOT EXISTS "PageView_path_idx"      ON "PageView" ("path");

CREATE TABLE IF NOT EXISTS "DemoSession" (
  "id"         TEXT PRIMARY KEY,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "slug"       TEXT NOT NULL,
  "sessionId"  TEXT NOT NULL,
  "userId"     TEXT,
  "durationMs" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "DemoSession_createdAt_idx" ON "DemoSession" ("createdAt");
CREATE INDEX IF NOT EXISTS "DemoSession_slug_idx"      ON "DemoSession" ("slug");

CREATE TABLE IF NOT EXISTS "AgentMetric" (
  "id"         TEXT PRIMARY KEY,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "client"     TEXT NOT NULL,
  "metric"     TEXT NOT NULL,
  "value"      DOUBLE PRECISION NOT NULL,
  "unit"       TEXT
);
CREATE INDEX IF NOT EXISTS "AgentMetric_client_metric_capturedAt_idx"
  ON "AgentMetric" ("client", "metric", "capturedAt");

-- Optional: seed a couple of AgentMetric rows so the dashboard's client section
-- isn't empty on first load. Delete/replace with real data.
-- INSERT INTO "AgentMetric" ("id","client","metric","value","unit") VALUES
--   (gen_random_uuid()::text, 'Southmoor Vets', 'agent_runs',       1240, 'runs'),
--   (gen_random_uuid()::text, 'Southmoor Vets', 'hours_saved',       86,  'hours'),
--   (gen_random_uuid()::text, 'Articled',       'tasks_automated',  3120, 'tasks');
