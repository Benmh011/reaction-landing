import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// The managing door: how Reaction's own PMS changes what this site holds.
//
//   /api/manage/...            Authorization: Bearer <MANAGE_KEY>
//
// Every address under /api/manage goes through manageGate() below, by way of
// managed(). It answers only to the key set in Vercel as MANAGE_KEY (made in
// the PMS under Settings, Company, Website). Until that is set, none of these
// addresses exist: they answer 404, as any unknown page.
//
// MANAGE_KEY is not ANALYTICS_KEY. The figures key can only read totals; this
// one can change demos, requests, accounts and the opt-out list, so the two
// are kept apart and a site holding the same value for both refuses to manage.
//
// Nothing here signs anybody in, and no session can open it. The PMS says who
// pressed the button (X-Reaction-By); that name is written beside the change,
// as "PMS: <name>", and to the log. It is a record, not a permission: the key
// is the permission.
//
// Raw SQL throughout, like the rest of this project's newer parts, so the
// same statements can be run against a test database before they go live.

export const MANAGE_VERSION = 1;

const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const digest = (v: string) => createHash("sha256").update(v).digest();
// Compared as digests, so the time taken says nothing about how much of the key was right.
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export const answer = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: HEADERS });
export const refuse = (error: string, status: number) => answer({ error }, status);

/** Something asked for that will not be done, with the words to say and the status to say them with. */
export class Refusal extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

type Gate = { ok: true; by: string } | { ok: false; response: NextResponse };

export function manageGate(req: Request): Gate {
  const key = process.env.MANAGE_KEY ?? "";
  if (key.length < 32) return { ok: false, response: new NextResponse(null, { status: 404, headers: HEADERS }) };

  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!given || !same(given, key)) return { ok: false, response: refuse("That key is not the one this site holds for managing it.", 401) };

  const figures = process.env.ANALYTICS_KEY ?? "";
  if (figures && same(figures, key)) {
    return { ok: false, response: refuse("This site holds the same value for MANAGE_KEY and ANALYTICS_KEY. They must be two different keys: make a new managing key in the PMS and set it as MANAGE_KEY.", 409) };
  }

  let who = "";
  try { who = decodeURIComponent(req.headers.get("x-reaction-by") ?? ""); } catch { who = ""; }
  who = who.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return { ok: true, by: `PMS: ${who || "nobody named"}` };
}

type Handler = (req: Request, by: string) => Promise<NextResponse>;

/** Wrap a handler so it runs only behind the gate, and so a refusal or a failure is answered in words.
 *  Which demo, request or account is meant always comes in the body (or ?id= for a removal), never in
 *  the path: no folder under app/api/manage has square brackets in its name. */
export function managed(handler: Handler) {
  return async (req: Request) => {
    const gate = manageGate(req);
    if (!gate.ok) return gate.response;
    try {
      return await handler(req, gate.by);
    } catch (e) {
      if (e instanceof Refusal) return refuse(e.message, e.status);
      console.error("[manage]", req.method, new URL(req.url).pathname, e);
      return refuse("The site could not do that just now. Its own log says why.", 500);
    }
  };
}

/* ---------- small things every part uses ---------- */

/** One statement, with its values passed separately and never written into it. */
export async function sql<T = Record<string, unknown>>(q: string, ...p: unknown[]): Promise<T[]> {
  return (await prisma.$queryRawUnsafe(q, ...p)) as T[];
}

/** The body as an object, or an empty one. */
export async function bodyOf(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Which row is meant: the id sent in the body. */
export function idOf(b: Record<string, unknown>, what: string): string {
  const id = text(b.id, 100);
  if (!id) throw new Refusal(`Which ${what} was not said.`);
  return id;
}

/** An id of the shape the other rows have: a letter and twenty-four more. */
export const newId = () => "c" + BigInt("0x" + randomBytes(16).toString("hex")).toString(36).padStart(24, "0").slice(-24);

/** A stored time, written the way the PMS reads it. The columns hold UTC. */
export const AT = (col: string) => `to_char(${col}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
/** Now, as the columns hold it. */
export const NOW = `(now() AT TIME ZONE 'UTC')`;

export const REQUEST_TYPES = ["BUSINESS", "UNIVERSITY", "STUDENTS_UNION", "EMPLOYER", "CHARITY", "OTHER"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
export const isRequestType = (v: unknown): v is RequestType => typeof v === "string" && (REQUEST_TYPES as readonly string[]).includes(v);

export const isEmail = (v: string) => v.length <= 200 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/** What an account is shown on /demo: a demo's slug, or an older build's name. Letters, digits, dashes and underscores. */
export const isDemoVersion = (v: string) => /^[A-Za-z0-9_-]{1,64}$/.test(v);

/** True when a statement failed because a table or column it names has not been made in the database yet. */
export function notMadeYet(e: unknown): boolean {
  const x = e as { code?: string; meta?: { code?: string }; message?: string } | null;
  const code = x?.meta?.code ?? x?.code ?? "";
  return code === "42P01" || code === "42703" || /(relation|column) .* does not exist/i.test(String(x?.message ?? ""));
}

/** The line this project already writes to its log for changes to accounts. */
export const logChange = (what: string, by: string, details: Record<string, unknown>) =>
  console.log(`[AUDIT] ${what} ${Object.entries(details).map(([k, v]) => `${k}=${String(v)}`).join(" ")} by="${by}" at=${new Date().toISOString()}`);
