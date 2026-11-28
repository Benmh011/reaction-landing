import bcrypt from "bcryptjs";
import { AT, NOW, Refusal, answer, bodyOf, idOf, isDemoVersion, isEmail, isRequestType, managed, newId, logChange, sql, text } from "@/lib/manage";

// GET    /api/manage/users — the accounts that can sign in to this site, newest first.
//        Never a password or its hash: only whether the account has one.
// POST   /api/manage/users { email, name, organisation, requestType?, demoVersion?, password }
//        Make an account ready to sign in with a password, as /admin/users/new does.
//        The password is chosen in the PMS, shown there once, and kept here only as a hash.
// PATCH  /api/manage/users { id, demoVersion } — which demo the account sees on /demo:
//        a demo's slug, or null for none. The person sees the change the next time
//        they sign in, because the site reads it into their session at sign-in.
// DELETE /api/manage/users?id=... — remove a client's account, as /admin/users does:
//        the requests it came from keep their record and lose only the link.
//
// Only client accounts can be removed from here. An administrator of this site
// is removed on the site itself, by another administrator, and a pilot
// student's account carries their pilot records with it, so neither is removed
// by a button in another system.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAKE = 2000;

export const GET = managed(async () => {
  const users = await sql(
    `SELECT "id", "email", COALESCE("name", '') AS "name", COALESCE("organisation", '') AS "organisation",
            "role"::text AS "role", "requestType"::text AS "requestType", "demoVersion",
            ("passwordHash" IS NOT NULL) AS "hasPassword", ${AT(`"createdAt"`)} AS "createdAt"
       FROM "User"
      ORDER BY "createdAt" DESC, "id"
      LIMIT ${TAKE}`,
  );
  return answer({ users, most: TAKE });
});

export const POST = managed(async (req, by) => {
  const b = await bodyOf(req);
  const email = text(b.email, 200).toLowerCase();
  const name = text(b.name, 120);
  const organisation = text(b.organisation, 200);
  const demoVersion = text(b.demoVersion, 64) || "default";
  const requestType = "requestType" in b ? b.requestType : "BUSINESS";
  const password = typeof b.password === "string" ? b.password : "";

  if (!isEmail(email)) throw new Refusal("That does not look like an email address.");
  if (name.length < 2) throw new Refusal("The account needs the person's name.");
  if (!organisation) throw new Refusal("The account needs the organisation they are from.");
  if (!isRequestType(requestType)) throw new Refusal("That is not one of the kinds of organisation.");
  if (!isDemoVersion(demoVersion)) throw new Refusal("That is not a demo this site knows how to give an account.");
  if (password.length < 10 || password.length > 200) throw new Refusal("The password must be at least 10 characters.");

  const passwordHash = await bcrypt.hash(password, 10);
  // emailVerified is set because the account is made by us: there is no email round trip to wait for.
  const made = await sql<{ id: string; email: string }>(
    `INSERT INTO "User" ("id", "email", "name", "organisation", "requestType", "demoVersion", "passwordHash", "role", "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::text::"RequestType", $6, $7, 'CLIENT', ${NOW}, ${NOW}, ${NOW})
     ON CONFLICT ("email") DO NOTHING
     RETURNING "id", "email"`,
    newId(), email, name, organisation, requestType, demoVersion, passwordHash,
  );
  if (!made.length) throw new Refusal(`There is already an account for ${email}.`, 409);

  logChange("user_preprovisioned", by, { id: made[0].id, email, requestType, demoVersion });
  return answer({ ok: true, userId: made[0].id, email: made[0].email }, 201);
});

export const PATCH = managed(async (req, by) => {
  const b = await bodyOf(req);
  const id = idOf(b, "account");
  if (!("demoVersion" in b)) throw new Refusal("Nothing to change.");
  const demoVersion = b.demoVersion === null ? null : text(b.demoVersion, 64) || null;
  if (demoVersion !== null && !isDemoVersion(demoVersion)) throw new Refusal("That is not a demo this site knows how to give an account.");

  const rows = await sql<{ id: string; email: string; demoVersion: string | null }>(
    `UPDATE "User" SET "demoVersion" = $2, "updatedAt" = ${NOW} WHERE "id" = $1 RETURNING "id", "email", "demoVersion"`,
    id, demoVersion,
  );
  if (!rows.length) throw new Refusal("That account is no longer on the site.", 404);
  logChange("user_demo_changed", by, { id: rows[0].id, email: rows[0].email, demoVersion: demoVersion ?? "none" });
  return answer({ ok: true, userId: rows[0].id, demoVersion: rows[0].demoVersion });
});

export const DELETE = managed(async (req, by) => {
  const id = text(new URL(req.url).searchParams.get("id"), 100);
  if (!id) throw new Refusal("Which account was not said.");
  const found = await sql<{ id: string; email: string; role: string }>(`SELECT "id", "email", "role"::text AS "role" FROM "User" WHERE "id" = $1`, id);
  const target = found[0];
  if (!target) throw new Refusal("That account is no longer on the site.", 404);
  if (target.role === "ADMIN") throw new Refusal("That account is an administrator of the site. An administrator is removed on the site itself, under Admin, Users.", 409);
  if (target.role !== "CLIENT") throw new Refusal("That is a pilot student's account, which carries their pilot records. It is removed on the site itself, under Admin, Users.", 409);

  // The requests keep their record of having been approved, without a link to an account that is gone.
  await sql(`UPDATE "DemoRequest" SET "approvedUserId" = NULL WHERE "approvedUserId" = $1 RETURNING "id"`, target.id);
  // The role is checked again in the statement, so an account made an administrator in the meantime stays.
  const gone = await sql<{ id: string }>(`DELETE FROM "User" WHERE "id" = $1 AND "role" = 'CLIENT' RETURNING "id"`, target.id);
  if (!gone.length) throw new Refusal("That account changed while it was being removed. Nothing was removed: read the list again.", 409);

  logChange("user_deleted", by, { id: target.id, email: target.email, role: target.role });
  return answer({ ok: true });
});
