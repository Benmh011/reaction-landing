// Edge-safe session helpers. IMPORTANT: import ONLY jose here.
// This file runs inside middleware (Edge runtime), so it must NOT
// import prisma or bcryptjs (those are Node-only).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sm_session";

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    // In dev with no secret, fall back so the app still runs.
    // Production MUST set AUTH_SECRET.
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(payload: { email: string; name?: string | null }) {
  return new SignJWT({ email: payload.email, name: payload.name ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { email: string; name?: string | null };
  } catch {
    return null;
  }
}
