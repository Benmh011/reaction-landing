import { getPicture } from "@/lib/articles";

// GET /api/articles/image?id=<the picture's id> — a picture in a published
// article. Public, like the article. A picture no published article uses is
// not served: taking an article off the site takes its pictures off too.
//
// The bytes are WebP, JPEG or PNG and were checked as such on the way in
// (app/api/manage/articles/images); they are sent as exactly that, with the
// browser told not to guess otherwise.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const picture = await getPicture(id);
  if (!picture) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(picture.bytes), {
    status: 200,
    headers: {
      "Content-Type": picture.mime,
      "Content-Length": String(picture.bytes.length),
      // An hour, so a picture taken off the site is gone from caches within the hour.
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Content-Disposition": "inline",
    },
  });
}
