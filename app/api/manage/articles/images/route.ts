import { createHash } from "node:crypto";
import { NOW, Refusal, answer, bodyOf, managed, logChange, notMadeYet, sql, text } from "@/lib/manage";
import { isPictureId } from "@/lib/articleBlocks";

// POST /api/manage/articles/images { id, mime, width, height, data }
//
// Keep a picture an article is about to use. `data` is the picture's bytes in
// base64 and `id` is the SHA-256 of those bytes: the site works the hash out
// itself and refuses a picture whose id is not its own, so a picture can never
// be swapped for another under the same id. Sending one that is already here
// changes nothing.
//
// Only what a browser shows as a picture and nothing else: WebP, JPEG or PNG,
// told by the bytes themselves and not by what the sender calls them. No SVG,
// which can carry script. Two megabytes at most; the PMS shrinks a picture
// before sending it.
//
// A picture kept here is not public by being here: the site serves it only
// while a published article uses it (app/api/articles/image).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOST = 2 * 1024 * 1024;

/** What the bytes are, from how they begin. */
function kindOf(b: Buffer): string | null {
  if (b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b.toString("latin1", 1, 4) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  return null;
}

export const POST = managed(async (req, by) => {
  const b = await bodyOf(req);
  if (!isPictureId(b.id)) throw new Refusal("The picture does not say which one it is.");
  const data = typeof b.data === "string" ? b.data : "";
  if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Refusal("The picture did not arrive whole.");
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length) throw new Refusal("The picture did not arrive whole.");
  if (bytes.length > MOST) throw new Refusal("The picture is larger than two megabytes after shrinking. Use a smaller one.");
  if (createHash("sha256").update(bytes).digest("hex") !== b.id) throw new Refusal("The picture that arrived is not the one it says it is. Nothing was kept.");
  const mime = kindOf(bytes);
  if (!mime) throw new Refusal("That is not a kind of picture the website shows. It takes WebP, JPEG and PNG.");
  if (text(b.mime, 40) && text(b.mime, 40) !== mime) throw new Refusal("The picture is not the kind it says it is. Nothing was kept.");
  const width = Number(b.width), height = Number(b.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8000 || height > 8000) throw new Refusal("The picture's size was not given.");

  let made: { id: string }[];
  try {
    made = await sql<{ id: string }>(
      `INSERT INTO "ArticleImage" ("id", "createdAt", "mime", "width", "height", "bytes")
       VALUES ($1, ${NOW}, $2, $3::text::int, $4::text::int, decode($5, 'base64'))
       ON CONFLICT ("id") DO NOTHING
       RETURNING "id"`,
      b.id, mime, String(width), String(height), bytes.toString("base64"),
    );
  } catch (e) {
    if (notMadeYet(e)) throw new Refusal("The site's database has no articles tables yet. Run db/articles.sql in the Neon SQL editor, then try again. Nothing was kept.", 409);
    throw e;
  }
  if (made.length) logChange("article_picture_kept", by, { id: b.id.slice(0, 12), mime, bytes: bytes.length });
  return answer({ ok: true, id: b.id, kept: made.length === 1 }, made.length ? 201 : 200);
});
