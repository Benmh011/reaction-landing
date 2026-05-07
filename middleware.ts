import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // /admin/* requires ADMIN role
  if (pathname.startsWith("/admin")) {
    // The /admin/setup route is exempt — it's how the very first admin gets created
    if (pathname === "/admin/setup") return NextResponse.next();
    if (!isLoggedIn) {
      const url = new URL("/auth/signin", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
  }

  // /portal/* requires any authenticated user
  if (pathname.startsWith("/portal")) {
    if (!isLoggedIn) {
      const url = new URL("/auth/signin", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // /demo-app/* requires authentication. The route handler then enforces
  // demoVersion-based authorisation (user can only see their own demo,
  // unless they are admin).
  if (pathname.startsWith("/demo-app")) {
    if (!isLoggedIn) {
      const url = new URL("/auth/signin", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*", "/demo-app/:path*"],
};
