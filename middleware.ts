import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/vet/auth";

/**
 * Login wall for the Southmoor Vets demo — ported from the vet app and
 * scoped to its mount points only. The rest of reaction.org.uk (including
 * Auth.js magic-link routes) is untouched by this middleware.
 *
 * Same accounts, same passwords: /api/vet/login checks bcrypt hashes in the
 * vet app's own database, so credentials issued for
 * reactionbusinessservices.co.uk work here by construction.
 */

const PUBLIC = ["/demos/southmoor/login", "/api/vet/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/demos/southmoor/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/demos/southmoor", "/demos/southmoor/:path*", "/api/vet/:path*"],
};
