-- ─────────────────────────────────────────────────────────────
-- Articles (/articles) — run once in the Neon SQL editor.
--
-- Articles are written in Reaction's PMS and published to this site through
-- the managing door (/api/manage/articles). This file makes the two tables
-- they are kept in. Until it is run, /articles shows nothing, the menu has no
-- Articles item, and the PMS is told to run this file when it tries to
-- publish.
--
-- Raw SQL only on this project: never `prisma migrate` / `db push`.
-- Idempotent: running it again when the tables are there changes nothing.
-- ─────────────────────────────────────────────────────────────

-- 1) A published article, as the site shows it. One row for each; publishing
--    the same article again replaces its row. "sourceId" is the article's id
--    in the PMS, which is how the two are matched. "body" is the article's
--    blocks as JSON text (lib/articleBlocks.ts), never HTML.
CREATE TABLE IF NOT EXISTS "Article" (
  "id"          TEXT PRIMARY KEY,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceId"    TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "standfirst"  TEXT NOT NULL DEFAULT '',
  "summary"     TEXT NOT NULL,
  "dateShown"   DATE NOT NULL,
  "readMinutes" INTEGER NOT NULL DEFAULT 1,
  "body"        TEXT NOT NULL,
  "publishedBy" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "Article_slug_key" ON "Article"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Article_sourceId_key" ON "Article"("sourceId");
CREATE INDEX IF NOT EXISTS "Article_dateShown_idx" ON "Article"("dateShown");

-- 2) The pictures articles use. A picture's id is the SHA-256 of its bytes, so
--    the same picture is kept once however many times it is sent. A picture is
--    only served while a published article uses it.
CREATE TABLE IF NOT EXISTS "ArticleImage" (
  "id"        TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mime"      TEXT NOT NULL,
  "width"     INTEGER NOT NULL,
  "height"    INTEGER NOT NULL,
  "bytes"     BYTEA NOT NULL
);
