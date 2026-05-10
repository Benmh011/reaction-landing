import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Validation schema. Mirrors the form fields. The email is admin-controlled
// (not a real customer email) so we just sanity-check format, not reachability.
const schema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(2).max(120),
  organisation: z.string().min(1).max(200),
  requestType: z.enum(["UNIVERSITY", "STUDENTS_UNION", "EMPLOYER", "CHARITY", "OTHER"]).default("UNIVERSITY"),
  demoVersion: z.string().min(1).max(64),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
});

export async function POST(req: Request) {
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { email, name, organisation, requestType, demoVersion, password } = parsed.data;
  const lowerEmail = email.toLowerCase();

  // Prevent collision with an existing user.
  const existing = await prisma.user.findUnique({ where: { email: lowerEmail } });
  if (existing) {
    return NextResponse.json(
      { error: `A user with email "${lowerEmail}" already exists.` },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Create the user. emailVerified is set because admin pre-provisioned this
  // account — no email verification round-trip needed (and wouldn't work for
  // fake emails anyway).
  const user = await prisma.user.create({
    data: {
      email: lowerEmail,
      name,
      organisation,
      requestType,
      demoVersion,
      passwordHash,
      role: "CLIENT",
      emailVerified: new Date(),
    },
  });

  // Audit log — same format as the delete audit so they can be searched together.
  console.log(
    `[AUDIT] user_preprovisioned id=${user.id} email=${user.email} ` +
      `requestType=${user.requestType} demoVersion=${user.demoVersion} ` +
      `createdBy=${session.user.email} at=${new Date().toISOString()}`
  );

  return NextResponse.json({
    ok: true,
    userId: user.id,
    email: user.email,
  });
}
