import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH — update demoVersion or set/reset password
const patchSchema = z.object({
  demoVersion: z.string().max(64).nullable().optional(),
  password: z.string().min(10).max(200).optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input — password must be at least 10 characters" }, { status: 400 });
  }

  const updates: { demoVersion?: string | null; passwordHash?: string } = {};
  if (parsed.data.demoVersion !== undefined) updates.demoVersion = parsed.data.demoVersion;
  if (parsed.data.password) updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id: params.id }, data: updates });
  return NextResponse.json({ ok: true, userId: user.id });
}

// DELETE — hard-delete a user account
//
// Safety rails:
//   1. Cannot delete yourself (locks you out)
//   2. Cannot delete the last remaining ADMIN (locks everyone out)
//   3. Unlinks any DemoRequest.approvedUserId before deleting so the request
//      audit trail survives (showing APPROVED status without a user link)
//   4. Cascades through Account, Session via Prisma onDelete:Cascade
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Guard 1: Cannot delete yourself
  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: "You can't delete your own admin account. Sign in as a different admin first." },
      { status: 400 }
    );
  }

  // Look up the target so we can check role + log meaningful info
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, role: true, name: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Guard 2: Cannot delete the last admin
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin. Promote another user to ADMIN first." },
        { status: 400 }
      );
    }
  }

  // Step 1: Unlink any DemoRequests pointing at this user.
  // This preserves the historical record of "this request was approved" without
  // dangling FK references after deletion.
  await prisma.demoRequest.updateMany({
    where: { approvedUserId: params.id },
    data: { approvedUserId: null },
  });

  // Step 2: Hard delete. Cascade handles Account, Session via the schema.
  await prisma.user.delete({ where: { id: params.id } });

  // Lightweight audit trail: write to runtime logs (searchable in Vercel dashboard
  // for ~30 days on Hobby tier). Avoids a new table while still leaving a record.
  console.log(
    `[AUDIT] user_deleted id=${target.id} email=${target.email} role=${target.role} ` +
      `deletedBy=${session.user.email} at=${new Date().toISOString()}`
  );

  return NextResponse.json({ ok: true });
}
