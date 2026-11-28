import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cleanBlocks, type Block } from "@/lib/articleBlocks";

// Reading published articles, for the pages under /articles, the picture
// route and the menu. Articles are written in Reaction's PMS and arrive
// through the managing door (app/api/manage/articles); nothing here writes.
//
// Raw SQL, like the door. If the tables have not been made yet
// (db/articles.sql), every function here answers as if nothing were
// published, so the rest of the site is never affected.

export const ARTICLES_TAG = "articles";

export type ArticleCard = { slug: string; title: string; summary: string; dateShown: string; readMinutes: number };
export type ArticleFull = ArticleCard & { standfirst: string; body: Block[]; updatedAt: string };

async function rows<T>(q: string, ...p: unknown[]): Promise<T[]> {
  return (await prisma.$queryRawUnsafe(q, ...p)) as T[];
}

const CARD = `"slug", "title", "summary", to_char("dateShown", 'YYYY-MM-DD') AS "dateShown", "readMinutes"`;

/** Every published article, newest first by the date it shows. */
export async function listArticles(): Promise<ArticleCard[]> {
  try {
    return await rows<ArticleCard>(`SELECT ${CARD} FROM "Article" ORDER BY "dateShown" DESC, "updatedAt" DESC, "slug"`);
  } catch (e) {
    console.error("[articles] the list could not be read:", e);
    return [];
  }
}

/** One published article by its address, or null. Its body is checked again as it is read. */
export async function getArticle(slug: string): Promise<ArticleFull | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  try {
    const found = await rows<ArticleCard & { standfirst: string; body: string; updatedAt: string }>(
      `SELECT ${CARD}, "standfirst", "body", to_char("updatedAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt" FROM "Article" WHERE "slug" = $1`,
      slug,
    );
    const a = found[0];
    if (!a) return null;
    let body: unknown = [];
    try { body = JSON.parse(a.body); } catch { body = []; }
    return { ...a, body: cleanBlocks(body, false) };
  } catch (e) {
    console.error("[articles] an article could not be read:", e);
    return null;
  }
}

/** A picture's bytes, if a published article uses it. */
export async function getPicture(id: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!/^[0-9a-f]{64}$/.test(id)) return null;
  try {
    const found = await rows<{ mime: string; data: string }>(
      `SELECT i."mime", encode(i."bytes", 'base64') AS "data" FROM "ArticleImage" i
        WHERE i."id" = $1 AND EXISTS (SELECT 1 FROM "Article" a WHERE position($1 in a."body") > 0)`,
      id,
    );
    return found[0] ? { mime: found[0].mime, bytes: Buffer.from(found[0].data.replace(/\s+/g, ""), "base64") } : null;
  } catch (e) {
    console.error("[articles] a picture could not be read:", e);
    return null;
  }
}

// Whether anything is published, remembered between requests so the menu on
// every page does not ask the database each time. The door says when it has
// changed (revalidateTag); an hour is the longest it can be out of date.
const counted = unstable_cache(
  async () => {
    try {
      return ((await rows<{ c: number }>(`SELECT COUNT(*)::int AS "c" FROM "Article"`))[0]?.c ?? 0) > 0;
    } catch {
      return false;
    }
  },
  ["articles-any"],
  { tags: [ARTICLES_TAG], revalidate: 3600 },
);

/** Is there at least one published article? Decides whether the menu and footer carry Articles. Never throws. */
export async function anyArticles(): Promise<boolean> {
  try {
    return await counted();
  } catch {
    return false;
  }
}
