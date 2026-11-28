import { NOW, Refusal, answer, bodyOf, idOf, managed, newId, logChange, sql } from "@/lib/manage";
import { DEMO_COLUMNS, demoFields, listDemos, refreshDemoPages, slugOf, type DemoRow } from "@/lib/manageDemos";

// GET   /api/manage/demos — every demo in the catalogue, in the order /demo shows them.
// POST  /api/manage/demos { name, description, launchUrl, accessNote? } — add one, shown, at the end.
// PATCH /api/manage/demos { id, name?, description?, launchUrl?, accessNote?, active? } — change what a
//       demo says or where it opens, or show or hide it on /demo. Only what is in the body changes.
//
// The slug is made here from the name when a demo is added; if another demo
// has it, a number is added. It never changes after. A demo is hidden, not
// deleted: the accounts tied to it and the time counted against it stay as
// they were, and it can be shown again. See lib/manageDemos.ts for the rules.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = managed(async () => answer({ demos: await listDemos() }));

export const POST = managed(async (req, by) => {
  const f = demoFields(await bodyOf(req), true);
  const taken = new Set((await sql<{ slug: string }>(`SELECT "slug" FROM "Demo"`)).map((r) => r.slug));
  const base = slugOf(f.name!);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const made = await sql<DemoRow>(
    `INSERT INTO "Demo" ("id", "createdAt", "updatedAt", "slug", "name", "description", "launchUrl", "accessNote", "active", "sortOrder")
     VALUES ($1, ${NOW}, ${NOW}, $2, $3, $4, $5, $6, true, (SELECT COALESCE(MAX("sortOrder"), -1) + 1 FROM "Demo"))
     RETURNING ${DEMO_COLUMNS}`,
    newId(), slug, f.name, f.description, f.launchUrl, f.accessNote ?? null,
  );
  refreshDemoPages();
  logChange("demo_added", by, { id: made[0].id, slug });
  return answer({ demo: made[0] }, 201);
});

export const PATCH = managed(async (req, by) => {
  const b = await bodyOf(req);
  const id = idOf(b, "demo");
  const f = demoFields(b, false);
  const sets: string[] = [];
  const values: unknown[] = [id];
  const set = (column: string, value: unknown, cast = "") => { values.push(value); sets.push(`"${column}" = $${values.length}${cast}`); };
  if (f.name !== undefined) set("name", f.name);
  if (f.description !== undefined) set("description", f.description);
  if (f.launchUrl !== undefined) set("launchUrl", f.launchUrl);
  if (f.accessNote !== undefined) set("accessNote", f.accessNote);
  if ("active" in b) {
    if (typeof b.active !== "boolean") throw new Refusal("Shown or hidden is a yes or a no.");
    set("active", b.active, "::boolean");
  }
  if (!sets.length) throw new Refusal("Nothing to change.");

  const rows = await sql<DemoRow>(`UPDATE "Demo" SET ${sets.join(", ")}, "updatedAt" = ${NOW} WHERE "id" = $1 RETURNING ${DEMO_COLUMNS}`, ...values);
  if (!rows.length) throw new Refusal("That demo is no longer in the catalogue.", 404);
  refreshDemoPages();
  logChange("demo_changed", by, { id: rows[0].id, slug: rows[0].slug, changed: sets.map((x) => x.split('"')[1]).join("+") });
  return answer({ demo: rows[0] });
});
