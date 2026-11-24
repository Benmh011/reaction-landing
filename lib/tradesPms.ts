// Trades PMS on the web: who may open it, and where each login's data lives.
//
// The app itself is the folder /trades-pms at the top of this repo: the same
// source the desktop (Electron) build runs. In the browser its SQLite database
// lives in memory, and after every change the whole database file is sent here
// and kept against the signed-in user. One row per user, so every login has
// its own separate data, exactly as every desktop installation has its own file.
//
// Table: "TradesPmsStore" (db/trades-pms.sql). Raw SQL on purpose, so the
// Prisma schema does not change.

import { gunzipSync } from "node:zlib";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const TRADES_PMS_URL = "/demos/trades-pms";

// A request body on Vercel can be at most 4.5 MB. A year of a busy sole
// trader's data is a few hundred KB once compressed, so this is generous.
export const MAX_STORE_BYTES = 4 * 1024 * 1024;
// The most a compressed upload is allowed to unpack to.
const MAX_UNPACKED_BYTES = 64 * 1024 * 1024;

// Who may open it:
//  · ADMIN — always
//  · a signed-in user whose demo version is the slug of the catalogue row
//    that launches this app (the active "Demo" row whose launch link is
//    /demos/trades-pms). Nothing is hard-coded: whichever catalogue row points
//    here, approving a user for that row is what grants access.
// The slugs are remembered for a minute so that loading the app's twenty or
// so files does not mean twenty trips to the database.
let slugCache: { at: number; slugs: string[] } | null = null;

async function launchSlugs(): Promise<string[]> {
  if (slugCache && Date.now() - slugCache.at < 60_000) return slugCache.slugs;
  const rows = await prisma.$queryRawUnsafe<{ slug: string }[]>(
    'SELECT "slug" FROM "Demo" WHERE "active" = true AND "launchUrl" LIKE $1',
    `%${TRADES_PMS_URL}%`,
  );
  slugCache = { at: Date.now(), slugs: rows.map((r: { slug: string }) => r.slug) };
  return slugCache.slugs;
}

export type Gate =
  | { ok: true; userId: string }
  | { ok: false; status: 401 }
  | { ok: false; status: 403; email: string };

/** Signed in, and either an admin or approved for this demo. Fails closed. */
export async function tradesPmsGate(): Promise<Gate> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { ok: false, status: 401 };
  if (user.role === "ADMIN") return { ok: true, userId: user.id };
  let entitled = false;
  try {
    entitled = !!user.demoVersion && (await launchSlugs()).includes(user.demoVersion);
  } catch (e) {
    console.error("trades-pms gate: catalogue lookup failed:", e);
  }
  if (!entitled) return { ok: false, status: 403, email: user.email ?? "this account" };
  return { ok: true, userId: user.id };
}

export type Encoding = "gzip" | "none";
export type Stored = { data: Buffer; encoding: Encoding; version: number };

// The file crosses the database driver as base64 text and is turned to and
// from real bytes inside Postgres, so the column is a proper BYTEA.
type StoreRow = { data: string; encoding: string; version: number };
type VersionRow = { version: number };

/** The saved database for one user, or null if they have never saved. */
export async function loadStore(userId: string): Promise<Stored | null> {
  const rows = await prisma.$queryRawUnsafe<StoreRow[]>(
    `SELECT encode("data", 'base64') AS "data", "encoding", "version" FROM "TradesPmsStore" WHERE "userId" = $1`,
    userId,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    data: Buffer.from(row.data, "base64"),
    encoding: row.encoding === "gzip" ? "gzip" : "none",
    version: Number(row.version),
  };
}

/**
 * Save one user's database, but only if it is based on the version the server
 * holds. Returns the new version, or null when the user's data has been saved
 * from somewhere else in the meantime (the caller answers 409 and the page
 * asks the user to reload, so nothing is overwritten without them knowing).
 */
export async function saveStore(
  userId: string,
  baseVersion: number,
  data: Buffer,
  encoding: Encoding,
): Promise<number | null> {
  const rows =
    baseVersion === 0
      ? await prisma.$queryRawUnsafe<VersionRow[]>(
          `INSERT INTO "TradesPmsStore" ("userId", "data", "encoding", "version", "bytes", "updatedAt")
           VALUES ($1, decode($2, 'base64'), $3, 1, $4::int, CURRENT_TIMESTAMP)
           ON CONFLICT ("userId") DO NOTHING
           RETURNING "version"`,
          userId,
          data.toString("base64"),
          encoding,
          data.length,
        )
      : await prisma.$queryRawUnsafe<VersionRow[]>(
          `UPDATE "TradesPmsStore"
              SET "data" = decode($2, 'base64'), "encoding" = $3, "bytes" = $4::int,
                  "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "userId" = $1 AND "version" = $5::int
           RETURNING "version"`,
          userId,
          data.toString("base64"),
          encoding,
          data.length,
          baseVersion,
        );
  return rows[0] ? Number(rows[0].version) : null;
}

const SQLITE_HEADER = Buffer.from("SQLite format 3\u0000", "latin1");

/** True when the upload really is a SQLite database file (after unpacking). */
export function looksLikeSqlite(data: Buffer, encoding: Encoding): boolean {
  try {
    const raw = encoding === "gzip" ? gunzipSync(data, { maxOutputLength: MAX_UNPACKED_BYTES }) : data;
    return raw.length >= 512 && raw.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER);
  } catch {
    return false;
  }
}
