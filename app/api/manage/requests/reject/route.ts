import { NOW, Refusal, answer, bodyOf, idOf, managed, logChange, sql } from "@/lib/manage";

// POST /api/manage/requests/reject { id } — mark a waiting request rejected, with
// who rejected it. Nothing is sent to the person. A request that has already
// been approved or rejected is left as it is.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = managed(async (req, by) => {
  const id = idOf(await bodyOf(req), "request");
  const done = await sql<{ id: string }>(
    `UPDATE "DemoRequest" SET "status" = 'REJECTED', "reviewedAt" = ${NOW}, "reviewedBy" = $2 WHERE "id" = $1 AND "status" = 'PENDING' RETURNING "id"`,
    id, by,
  );
  if (!done.length) {
    const is = await sql<{ status: string }>(`SELECT "status"::text AS "status" FROM "DemoRequest" WHERE "id" = $1`, id);
    if (!is.length) throw new Refusal("That request is no longer on the site.", 404);
    throw new Refusal(`That request has already been ${is[0].status === "APPROVED" ? "approved" : "rejected"}.`, 409);
  }
  logChange("request_rejected", by, { id });
  return answer({ ok: true });
});
