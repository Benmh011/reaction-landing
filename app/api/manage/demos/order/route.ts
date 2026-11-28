import { NOW, Refusal, answer, bodyOf, managed, logChange, sql } from "@/lib/manage";
import { listDemos, refreshDemoPages } from "@/lib/manageDemos";

// POST /api/manage/demos/order { ids: [...] } — the order /demo shows them in.
//
// The list must name every demo once. If a demo was added or the list is
// otherwise not the catalogue as it stands, nothing is moved and the PMS is
// told to read the list again, so an order is never applied to a catalogue
// that has changed underneath it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = managed(async (req, by) => {
  const b = await bodyOf(req);
  const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is string => typeof x === "string") : [];
  const now = (await sql<{ id: string }>(`SELECT "id" FROM "Demo"`)).map((r) => r.id);
  const given = new Set(ids);
  if (!ids.length || given.size !== ids.length || ids.length !== now.length || now.some((id) => !given.has(id))) {
    throw new Refusal("The catalogue has changed since that order was made. Read the list again and move them from there.", 409);
  }
  // One statement, so the order is all applied or not at all. The list goes as text and is unpacked there.
  await sql(
    `UPDATE "Demo" AS d SET "sortOrder" = (o.pos - 1)::int, "updatedAt" = ${NOW}
       FROM json_array_elements_text($1::text::json) WITH ORDINALITY AS o(id, pos)
      WHERE d."id" = o.id
     RETURNING d."id"`,
    JSON.stringify(ids),
  );
  refreshDemoPages();
  logChange("demos_reordered", by, { count: ids.length });
  return answer({ demos: await listDemos() });
});
