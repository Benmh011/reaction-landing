import { MANAGE_VERSION, answer, managed, sql } from "@/lib/manage";

// GET /api/manage — is the door open, and what is behind it.
//
// What the PMS asks first, and what its "Check the connection" shows: the
// parts this site can be managed through, and a count for each. A count that
// could not be read (a table not made yet) comes back as null with a note
// saying which, rather than failing the whole answer.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = managed(async (req) => {
  const notes: string[] = [];
  const count = async (label: string, q: string): Promise<number | null> => {
    try {
      return Number((await sql<{ c: number }>(q))[0]?.c ?? 0);
    } catch (e) {
      console.error("[manage] count", label, e);
      notes.push(`${label} could not be read on the site.`);
      return null;
    }
  };

  const [demos, shown, waiting, users, optOuts] = await Promise.all([
    count("The demos", `SELECT COUNT(*)::int AS c FROM "Demo"`),
    count("The demos", `SELECT COUNT(*)::int AS c FROM "Demo" WHERE "active" = true`),
    count("The requests", `SELECT COUNT(*)::int AS c FROM "DemoRequest" WHERE "status" = 'PENDING'`),
    count("The accounts", `SELECT COUNT(*)::int AS c FROM "User"`),
    count("The opt-out list", `SELECT COUNT(*)::int AS c FROM "EmailOptOut"`),
  ]);

  return answer({
    version: MANAGE_VERSION,
    site: req.headers.get("host") ?? "",
    parts: ["demos", "requests", "users", "optouts"],
    counts: { demos, shown, waiting, users, optOuts },
    notes: [...new Set(notes)],
  });
});
