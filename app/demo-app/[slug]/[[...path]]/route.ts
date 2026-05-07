import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import path from "path";
import fs from "fs/promises";

// Maps file extensions to MIME types so the browser knows how to handle each asset
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".txt":  "text/plain; charset=utf-8",
  ".map":  "application/json; charset=utf-8",
};

// Where the bundled demo files live — outside of /public so Next.js doesn't auto-serve them
const PRIVATE_DEMOS_ROOT = path.resolve(process.cwd(), "private-demos");

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string; path?: string[] }> }
) {
  const { slug, path: pathSegments = [] } = await context.params;

  // ── Auth gate ──
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", _req.url));
  }

  // ── Authorisation gate ──
  // Admins see anything. Otherwise the user's demoVersion must match the requested slug.
  const isAdmin = session.user.role === "ADMIN";
  const userDemo = session.user.demoVersion;
  if (!isAdmin && userDemo !== slug) {
    // 404 (not 403) so we don't leak the existence of demos for other clients
    return new NextResponse("Not Found", { status: 404 });
  }

  // ── Resolve the file ──
  // If the URL is /demo-app/exeter/   → serve index.html
  // If /demo-app/exeter/assets/foo.js → serve that file
  const requestedPath = pathSegments.length === 0 ? ["index.html"] : pathSegments;

  // Build absolute path AND validate it's still within the demo folder (prevents ../../etc/passwd shenanigans)
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "");
  if (safeSlug !== slug) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const demoRoot = path.join(PRIVATE_DEMOS_ROOT, safeSlug);
  const filePath = path.resolve(demoRoot, ...requestedPath);
  if (!filePath.startsWith(demoRoot + path.sep) && filePath !== demoRoot) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // ── Read and stream the file ──
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch (err: any) {
    // ENOENT for missing file, EISDIR for directory request — both 404
    if (err.code === "ENOENT" || err.code === "EISDIR") {
      // If the path is a directory and they asked for it without a trailing slash, try index.html inside
      if (err.code === "EISDIR" || pathSegments.length === 0) {
        try {
          buffer = await fs.readFile(path.join(filePath, "index.html"));
        } catch {
          return new NextResponse("Not Found", { status: 404 });
        }
      } else {
        return new NextResponse("Not Found", { status: 404 });
      }
    } else {
      console.error("Demo file read error:", err);
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  }

  // ── Pick MIME type from extension ──
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  // Cache static assets aggressively, but never cache the entry HTML
  const isHTML = ext === ".html";
  const cacheControl = isHTML
    ? "no-store, no-cache, must-revalidate"
    : "public, max-age=31536000, immutable";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      // Strict — prevent the demo from being framed by other sites
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
