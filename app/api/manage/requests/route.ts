import { AT, answer, managed, sql } from "@/lib/manage";

// GET /api/manage/requests — the demo requests, newest first, with how many
// are waiting, approved and rejected. An approved one carries the demo its
// account was given, read from the account as it stands now.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAKE = 500;

export const GET = managed(async () => {
  const [requests, byStatus] = await Promise.all([
    sql(
      `SELECT r."id", ${AT(`r."createdAt"`)} AS "at", r."name", r."email", r."organisation",
              COALESCE(r."role", '') AS "role", COALESCE(r."sector", '') AS "sector", COALESCE(r."message", '') AS "message",
              r."requestType"::text AS "requestType", r."status"::text AS "status",
              ${AT(`r."reviewedAt"`)} AS "reviewedAt", COALESCE(r."reviewedBy", '') AS "reviewedBy",
              r."approvedUserId", u."demoVersion" AS "demoVersion"
         FROM "DemoRequest" r LEFT JOIN "User" u ON u."id" = r."approvedUserId"
        ORDER BY r."createdAt" DESC, r."id"
        LIMIT ${TAKE}`,
    ),
    sql<{ status: string; c: number }>(`SELECT "status"::text AS "status", COUNT(*)::int AS "c" FROM "DemoRequest" GROUP BY 1`),
  ]);
  const of = (s: string) => byStatus.find((r) => r.status === s)?.c ?? 0;
  return answer({ requests, counts: { waiting: of("PENDING"), approved: of("APPROVED"), rejected: of("REJECTED") }, most: TAKE });
});
