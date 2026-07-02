-- ═══════════════════════════════════════════════════════════════════════
--  ARTICLED — hosted demo tables (run once in reaction's Neon SQL editor)
--  Ported 1:1 from Benmh011/articled, namespaced Articled* so they share
--  reaction's database without colliding. Raw SQL only — never prisma migrate.
-- ═══════════════════════════════════════════════════════════════════════

-- pgvector, for the 1024-dim Titan embeddings
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "ArticledKbChunk" (
  "id"        TEXT PRIMARY KEY,
  "sourceId"  TEXT NOT NULL UNIQUE,
  "kind"      TEXT NOT NULL,
  "ref"       TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "category"  TEXT,
  "flag"      BOOLEAN NOT NULL DEFAULT false,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
-- Prisma leaves the vector column alone (Unsupported); add it by hand:
ALTER TABLE "ArticledKbChunk" ADD COLUMN IF NOT EXISTS "embedding" vector(1024);
CREATE INDEX IF NOT EXISTS "ArticledKbChunk_kind_idx" ON "ArticledKbChunk" ("kind");
CREATE INDEX IF NOT EXISTS "articled_kbchunk_embedding_idx"
  ON "ArticledKbChunk" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE IF NOT EXISTS "ArticledAuditTurn" (
  "id"             TEXT PRIMARY KEY,
  "userId"         TEXT,
  "conversationId" TEXT,
  "question"       TEXT NOT NULL,
  "answer"         TEXT NOT NULL,
  "sourceRefs"     TEXT[] NOT NULL DEFAULT '{}',
  "model"          TEXT NOT NULL,
  "latencyMs"      INTEGER NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ArticledAuditTurn_createdAt_idx" ON "ArticledAuditTurn" ("createdAt");
CREATE INDEX IF NOT EXISTS "ArticledAuditTurn_conversationId_idx" ON "ArticledAuditTurn" ("conversationId");

CREATE TABLE IF NOT EXISTS "ArticledConversation" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "title"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "ArticledConversation_userId_updatedAt_idx"
  ON "ArticledConversation" ("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "ArticledChatFile" (
  "id"             TEXT PRIMARY KEY,
  "auditTurnId"    TEXT,
  "conversationId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "filename"       TEXT NOT NULL,
  "mimeType"       TEXT NOT NULL,
  "kind"           TEXT NOT NULL,
  "data"           BYTEA NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ArticledChatFile_conversationId_idx" ON "ArticledChatFile" ("conversationId");
CREATE INDEX IF NOT EXISTS "ArticledChatFile_auditTurnId_idx" ON "ArticledChatFile" ("auditTurnId");

-- ─── Catalogue entry: Articled appears on /demo and launches in-app at /articled ───
INSERT INTO "Demo" ("id","slug","name","description","launchUrl","accessNote","active","sortOrder","createdAt","updatedAt")
VALUES (
  gen_random_uuid()::text,
  'articled',
  'Articled — Practice Assistant',
  'A knowledge assistant for a UK accountancy firm: FRS 102, HMRC manuals and firm procedures, with a practice-management dashboard. Ask about accounting treatment, tax, or how the firm does things.',
  '/articled',
  'Hosted in-app. Signed-in demo users share one workspace. Requires Bedrock env vars on reaction-landing.',
  true,
  10,
  now(), now()
)
ON CONFLICT ("slug") DO UPDATE
  SET "launchUrl" = EXCLUDED."launchUrl",
      "name"        = EXCLUDED."name",
      "description" = EXCLUDED."description";
