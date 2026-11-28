import { signIn } from "@/auth";
import { NOW, Refusal, answer, bodyOf, idOf, isDemoVersion, isRequestType, managed, newId, logChange, sql, text } from "@/lib/manage";

// POST /api/manage/requests/approve { id, demoVersion?, requestType? }
//
// What Approve on /admin/requests does, asked for from the PMS: the person
// gets an account (or their account is brought up to date), the request is
// marked approved with who approved it, and the sign-in email goes to them
// through the site's own sign-in, exactly as it does from the admin page.
//
// demoVersion is which demo the account sees on /demo: a demo's slug. Left
// out, it is "default", which shows none until one is chosen. requestType
// may correct what the person picked on the form.
//
// Two differences from the admin page, both on purpose: an account that is
// already an administrator of this site keeps that role, and a second request
// from somebody already approved is marked approved without failing.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestRow = { id: string; email: string; name: string; organisation: string; requestType: string; status: string };

export const POST = managed(async (req, by) => {
  const b = await bodyOf(req);
  const id = idOf(b, "request");
  const demoVersion = text(b.demoVersion, 64) || "default";
  if (!isDemoVersion(demoVersion)) throw new Refusal("That is not a demo this site knows how to give an account.");
  if ("requestType" in b && !isRequestType(b.requestType)) throw new Refusal("That is not one of the kinds of organisation.");

  const found = await sql<RequestRow>(
    `SELECT "id", "email", "name", "organisation", "requestType"::text AS "requestType", "status"::text AS "status" FROM "DemoRequest" WHERE "id" = $1`,
    id,
  );
  const request = found[0];
  if (!request) throw new Refusal("That request is no longer on the site.", 404);
  if (request.status !== "PENDING") throw new Refusal(`That request has already been ${request.status === "APPROVED" ? "approved" : "rejected"}.`, 409);

  const requestType = isRequestType(b.requestType) ? b.requestType : request.requestType;
  const email = request.email.toLowerCase().trim();

  // The account and the request in one statement, so neither is left half done.
  // emailVerified is set because we approved them: their first sign-in is not a separate check.
  const done = await sql<{ userId: string; claimed: number }>(
    `WITH u AS (
       INSERT INTO "User" ("id", "email", "name", "organisation", "demoVersion", "requestType", "role", "emailVerified", "createdAt", "updatedAt")
       VALUES ($2, $3, $4, $5, $6, $7::text::"RequestType", 'CLIENT', ${NOW}, ${NOW}, ${NOW})
       ON CONFLICT ("email") DO UPDATE SET
         "name" = EXCLUDED."name", "organisation" = EXCLUDED."organisation", "demoVersion" = EXCLUDED."demoVersion",
         "requestType" = EXCLUDED."requestType", "emailVerified" = EXCLUDED."emailVerified", "updatedAt" = EXCLUDED."updatedAt",
         "role" = CASE WHEN "User"."role" = 'ADMIN' THEN "User"."role" ELSE 'CLIENT'::"UserRole" END
       RETURNING "id"
     ), r AS (
       UPDATE "DemoRequest" SET
         "status" = 'APPROVED', "reviewedAt" = ${NOW}, "reviewedBy" = $8, "requestType" = $7::text::"RequestType",
         "approvedUserId" = CASE
           WHEN EXISTS (SELECT 1 FROM "DemoRequest" o WHERE o."id" <> $1 AND o."approvedUserId" = (SELECT "id" FROM u)) THEN NULL
           ELSE (SELECT "id" FROM u) END
       WHERE "id" = $1 AND "status" = 'PENDING'
       RETURNING "id"
     )
     SELECT (SELECT "id" FROM u) AS "userId", (SELECT COUNT(*)::int FROM r) AS "claimed"`,
    request.id, newId(), email, request.name, request.organisation, demoVersion, requestType, by,
  );
  if (!done[0]?.claimed) throw new Refusal("That request was dealt with by somebody else a moment ago.", 409);

  // The sign-in email: Auth.js makes a real single-use link and sends it through the
  // Resend settings in auth.ts. If sending fails the approval stands, and the answer says so.
  let emailSent = false;
  try {
    await signIn("resend", { email, redirect: false, redirectTo: "/demo" });
    emailSent = true;
  } catch (err) {
    console.error("[manage] approve: the sign-in email could not be sent:", err);
  }

  logChange("request_approved", by, { id: request.id, email, demoVersion, requestType, emailSent });
  return answer({
    ok: true,
    userId: done[0].userId,
    email,
    demoVersion,
    emailSent,
    fallbackUrl: emailSent ? null : `${process.env.AUTH_URL || "https://reaction.org.uk"}/auth/signin`,
  });
});
