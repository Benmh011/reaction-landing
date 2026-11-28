import { AT, NOW, Refusal, answer, bodyOf, isEmail, managed, logChange, notMadeYet, sql } from "@/lib/manage";

// GET  /api/manage/optouts — every address that has opted out of news and
//      offers on this site: the opt-out list (with the day), and any account
//      marked as opted out that is not on that list (with no day).
// POST /api/manage/optouts { optOuts: [{ email, at? }] } — record opt-outs
//      taken in the PMS, so this site stops too. An address already on the
//      list keeps the day it has.
//
// There is no way to take an address off the list from here. An opt-out is
// only ever added; somebody who wants news again says so to a person.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAKE = 5000;
const MOST = 500;

type Row = { email: string; at: string | null };

export const GET = managed(async () => {
  const notes: string[] = [];
  let listed: Row[] = [];
  let haveList = true;
  try {
    listed = await sql<Row>(`SELECT lower("email") AS "email", ${AT(`"optedOutAt"`)} AS "at" FROM "EmailOptOut" ORDER BY "optedOutAt" DESC, "email" LIMIT ${TAKE}`);
  } catch (e) {
    console.error("[manage] optouts: the opt-out list could not be read:", e);
    haveList = false;
    notes.push("The site's opt-out list could not be read, so only accounts marked as opted out are shown.");
  }
  const seen = new Set(listed.map((r) => r.email));
  let accounts: { email: string }[] = [];
  try {
    accounts = await sql<{ email: string }>(`SELECT lower("email") AS "email" FROM "User" WHERE "marketingOptOut" = true ORDER BY "email" LIMIT ${TAKE}`);
  } catch (e) {
    console.error("[manage] optouts: the mark on accounts could not be read:", e);
    notes.push("The mark on accounts that have opted out could not be read.");
  }
  const extra: Row[] = accounts.filter((a) => !seen.has(a.email)).map((a) => ({ email: a.email, at: null }));
  return answer({ optOuts: [...listed, ...extra], haveList, notes });
});

export const POST = managed(async (req, by) => {
  const b = await bodyOf(req);
  const given = Array.isArray(b.optOuts) ? b.optOuts : null;
  if (!given) throw new Refusal("Nothing to record.");
  if (given.length > MOST) throw new Refusal(`No more than ${MOST} at a time.`);

  const rows = new Map<string, string | null>();
  for (const g of given) {
    const email = typeof g?.email === "string" ? g.email.trim().toLowerCase() : "";
    if (!isEmail(email)) throw new Refusal(`${email ? `"${email.slice(0, 80)}"` : "One of them"} is not an email address. Nothing was recorded.`);
    const when = typeof g?.at === "string" && g.at ? new Date(g.at) : null;
    if (when && Number.isNaN(when.getTime())) throw new Refusal(`The day given for ${email} is not a date. Nothing was recorded.`);
    // A day in the future is not when somebody opted out: it is recorded as now.
    if (!rows.has(email)) rows.set(email, when && when.getTime() <= Date.now() ? when.toISOString() : null);
  }
  if (!rows.size) return answer({ ok: true, recorded: 0, already: 0, accounts: 0 });

  let done: { recorded: number; accounts: number }[];
  try {
    done = await record(JSON.stringify([...rows].map(([email, at]) => ({ email, at }))));
  } catch (e) {
    if (notMadeYet(e)) throw new Refusal("The site's database has no opt-out list yet. Run db/manage.sql in the Neon SQL editor, then try again. Nothing was recorded.", 409);
    throw e;
  }
  const recorded = done[0]?.recorded ?? 0;
  logChange("optouts_recorded", by, { given: rows.size, recorded, accounts: done[0]?.accounts ?? 0 });
  return answer({ ok: true, recorded, already: rows.size - recorded, accounts: done[0]?.accounts ?? 0 });
});

// The list goes as text and is unpacked there, in one statement: the list, and the mark on any account of that address.
const record = (list: string) =>
  sql<{ recorded: number; accounts: number }>(
    `WITH given AS (
       SELECT x."email", x."at" FROM json_to_recordset($1::text::json) AS x("email" text, "at" text)
     ), ins AS (
       INSERT INTO "EmailOptOut" ("email", "optedOutAt")
       SELECT g."email", COALESCE((g."at"::timestamptz AT TIME ZONE 'UTC'), ${NOW}) FROM given g
       ON CONFLICT ("email") DO NOTHING
       RETURNING "email"
     ), upd AS (
       UPDATE "User" SET "marketingOptOut" = true, "updatedAt" = ${NOW}
        WHERE lower("email") IN (SELECT g."email" FROM given g) AND "marketingOptOut" = false
       RETURNING "id"
     )
     SELECT (SELECT COUNT(*)::int FROM ins) AS "recorded", (SELECT COUNT(*)::int FROM upd) AS "accounts"`,
    list,
  );
