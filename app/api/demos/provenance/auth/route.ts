import { NextResponse } from "next/server";

// Access gate for the Provenance demo. The password lives server-side only:
// set PROVENANCE_DEMO_PASSWORD in Vercel env; the fallback below covers the
// gap until that's configured. Rotate by changing either.
const PASSWORD = process.env.PROVENANCE_DEMO_PASSWORD ?? "estuary-preview";

export const COOKIE_NAME = "provenance_demo";
export const COOKIE_VALUE = "granted";

export async function POST(req: Request) {
  let supplied = "";
  try {
    const body = await req.json();
    supplied = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  if (supplied.trim() !== PASSWORD) {
    return NextResponse.json({ ok: false, error: "That password isn't right." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/demos/provenance",
    maxAge: 60 * 60 * 24 * 7, // one week
  });
  return res;
}
