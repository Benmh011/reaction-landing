import { revalidatePath, revalidateTag } from "next/cache";
import { AT, NOW, Refusal, answer, bodyOf, managed, newId, logChange, notMadeYet, sql, text } from "@/lib/manage";
import { ArticleProblem, cleanArticle, pictureIds, readMinutes, wordsOf } from "@/lib/articleBlocks";
import { ARTICLES_TAG } from "@/lib/articles";

// GET    /api/manage/articles — what is published on this site: which article
//        (its id in the PMS), at which address, and when it last changed.
// POST   /api/manage/articles { sourceId, slug, title, standfirst, summary, dateShown, body }
//        Publish an article, or publish it again with its changes. The body is
//        blocks, checked here (lib/articleBlocks.ts): never HTML. Every picture
//        it uses must already be here (POST /api/manage/articles/images); if one
//        is not, nothing is published and the answer lists which.
// DELETE /api/manage/articles?sourceId=... — take an article off the site. Its
//        address stops working at once.
//
// An address belongs to one article: publishing a second article at an address
// in use is refused. Publishing the same article again replaces what was there.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_MADE = "The site's database has no articles table yet. Run db/articles.sql in the Neon SQL editor, then try again. Nothing was published.";
const unmade = (e: unknown): never => { if (notMadeYet(e)) throw new Refusal(NOT_MADE, 409); throw e; };
const taken = (e: unknown) => {
  const x = e as { code?: string; meta?: { code?: string }; message?: string } | null;
  return (x?.meta?.code ?? x?.code) === "23505" || /duplicate key value/i.test(String(x?.message ?? ""));
};

/** /articles, each article's own page and the menu read what is published: have them read it again. */
function refresh() {
  revalidateTag(ARTICLES_TAG);
  revalidatePath("/articles");
  revalidatePath("/articles/read");
}

export const GET = managed(async () => {
  const articles = await sql(
    `SELECT "sourceId", "slug", "title", to_char("dateShown", 'YYYY-MM-DD') AS "dateShown", "readMinutes", ${AT(`"updatedAt"`)} AS "updatedAt"
       FROM "Article" ORDER BY "dateShown" DESC, "updatedAt" DESC, "slug"`,
  ).catch(unmade);
  return answer({ articles });
});

export const POST = managed(async (req, by) => {
  let a;
  try { a = cleanArticle(await bodyOf(req)); } catch (e) { if (e instanceof ArticleProblem) throw new Refusal(e.message); throw e; }

  const ids = pictureIds(a.body);
  if (ids.length) {
    const have = new Set((await sql<{ id: string }>(`SELECT "id" FROM "ArticleImage" WHERE "id" IN (SELECT json_array_elements_text($1::text::json))`, JSON.stringify(ids)).catch(unmade)).map((r) => r.id));
    const missing = ids.filter((id) => !have.has(id));
    if (missing.length) return answer({ error: "The site does not have every picture this article uses yet. Nothing was published.", missing }, 409);
  }

  const before = await sql<{ sourceId: string; slug: string }>(`SELECT "sourceId", "slug" FROM "Article" WHERE "sourceId" = $1 OR "slug" = $2`, a.sourceId, a.slug).catch(unmade);
  if (before.some((r) => r.slug === a.slug && r.sourceId !== a.sourceId)) throw new Refusal(`There is already an article at /articles/${a.slug}. Give this one a different address.`, 409);
  const was = before.find((r) => r.sourceId === a.sourceId);

  const words = wordsOf(a.standfirst, a.body), minutes = readMinutes(words);
  let rows: { slug: string; updatedAt: string }[];
  try {
    rows = await sql<{ slug: string; updatedAt: string }>(
      `INSERT INTO "Article" ("id", "createdAt", "updatedAt", "sourceId", "slug", "title", "standfirst", "summary", "dateShown", "readMinutes", "body", "publishedBy")
       VALUES ($1, ${NOW}, ${NOW}, $2, $3, $4, $5, $6, $7::text::date, $8::text::int, $9, $10)
       ON CONFLICT ("sourceId") DO UPDATE SET
         "updatedAt" = EXCLUDED."updatedAt", "slug" = EXCLUDED."slug", "title" = EXCLUDED."title", "standfirst" = EXCLUDED."standfirst",
         "summary" = EXCLUDED."summary", "dateShown" = EXCLUDED."dateShown", "readMinutes" = EXCLUDED."readMinutes",
         "body" = EXCLUDED."body", "publishedBy" = EXCLUDED."publishedBy"
       RETURNING "slug", ${AT(`"updatedAt"`)} AS "updatedAt"`,
      newId(), a.sourceId, a.slug, a.title, a.standfirst, a.summary, a.dateShown, String(minutes), JSON.stringify(a.body), by,
    );
  } catch (e) {
    // Two articles published at one address in the same moment: the second is told, as above.
    if (taken(e)) throw new Refusal(`There is already an article at /articles/${a.slug}. Give this one a different address.`, 409);
    return unmade(e);
  }

  refresh();
  logChange(was ? "article_republished" : "article_published", by, { sourceId: a.sourceId, slug: a.slug, words, pictures: ids.length });
  return answer({ ok: true, slug: rows[0].slug, path: `/articles/${rows[0].slug}`, updatedAt: rows[0].updatedAt, words, readMinutes: minutes, wasThere: !!was }, was ? 200 : 201);
});

export const DELETE = managed(async (req, by) => {
  const sourceId = text(new URL(req.url).searchParams.get("sourceId"), 64);
  if (!sourceId) throw new Refusal("Which article was not said.");
  const gone = await sql<{ slug: string }>(`DELETE FROM "Article" WHERE "sourceId" = $1 RETURNING "slug"`, sourceId).catch(unmade);
  if (!gone.length) throw new Refusal("That article is not on the site.", 404);
  refresh();
  logChange("article_taken_off", by, { sourceId, slug: gone[0].slug });
  return answer({ ok: true, slug: gone[0].slug });
});
