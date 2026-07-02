import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/vet/db";
import bcrypt from "bcryptjs";
import { createSession, SESSION_COOKIE } from "@/lib/vet/auth";

// Node runtime (default for route handlers) — needed for prisma + bcryptjs.
export async function POST(req: NextRequest) {
  let email: string, password: string;
  try {
    const body = await req.json();
    email = String(body.email ?? "").toLowerCase().trim();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSession({ email: user.email, name: user.name });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // allow http on localhost
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
