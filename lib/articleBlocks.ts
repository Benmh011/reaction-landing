// What an article is made of, and the one place that decides whether
// something sent in is an article.
//
// An article's body is a list of blocks, not HTML. Each block is one of a
// small fixed set (a paragraph, a heading, a subheading, a quote, a list, a
// rule, a picture), and the words in it are runs of text that may be bold,
// italic or a link. Nothing else can be said in this shape: there is no way
// to carry a script, a style or a frame, so the page that shows an article
// (components/ArticleBody.tsx) builds it from these pieces and never from
// markup somebody typed.
//
// The PMS keeps the same file (lib/article-blocks.ts there) and checks an
// article with it before sending; this site checks again on the way in, and
// once more when a page is drawn. The two copies must stay the same.
//
// No database and no node built-ins: it runs anywhere.

export type Inline = { x: string; b?: true; i?: true; a?: string };
export type Block =
  | { t: "p" | "h" | "s" | "q"; c: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "hr" }
  | { t: "img"; id: string; w: number; h: number; caption: string };

export type ArticleIn = { sourceId: string; slug: string; title: string; standfirst: string; summary: string; dateShown: string; body: Block[] };

export const LIMITS = { blocks: 400, run: 6000, items: 80, pictures: 20, title: 160, standfirst: 400, summary: 400, slug: 80, link: 500, caption: 300 } as const;

/** Something about an article that is not right, in words fit to show the person who wrote it. */
export class ArticleProblem extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
/** Text with nothing in it but text: no control characters, no stray kinds of space. */
const plain = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b\u2028\u2029\ufeff]/g, "").replace(/[\t\n\r\u00a0]+/g, " ").slice(0, max) : "");
const line = (v: unknown, max: number) => plain(v, max).replace(/ +/g, " ").trim();

export const isPictureId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
export const isSlug = (v: unknown): v is string => typeof v === "string" && v.length <= LIMITS.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v);
export const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v + "T00:00:00Z").getTime()) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;

/** Where a link may lead: a web address, an email address, or a path on the site. Anything else is not a link. */
export function cleanLink(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const a = v.trim();
  if (!a || a.length > LIMITS.link || /[\s<>"'`\u0000-\u001f]/.test(a)) return null;
  if (/^https?:\/\/[^/]+/i.test(a)) return a;
  if (/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(a)) return a;
  if (/^\/(?!\/)/.test(a)) return a;
  return null;
}

/** Runs of words: empty runs dropped, neighbours with the same marks joined. */
function runs(v: unknown, strict: boolean): Inline[] {
  if (!Array.isArray(v)) { if (strict) throw new ArticleProblem("Part of the article is not in a shape the website can read."); return []; }
  const out: Inline[] = [];
  let length = 0;
  for (const r of v) {
    if (!isObject(r)) { if (strict) throw new ArticleProblem("Part of the article is not in a shape the website can read."); continue; }
    const x = plain(r.x, LIMITS.run);
    if (!x) continue;
    length += x.length;
    if (length > LIMITS.run) { if (strict) throw new ArticleProblem("One paragraph is too long. Split it into two."); break; }
    const run: Inline = { x };
    if (r.b === true) run.b = true;
    if (r.i === true) run.i = true;
    if (r.a !== undefined) {
      const a = cleanLink(r.a);
      if (a) run.a = a;
      else if (strict) throw new ArticleProblem(`A link in the article does not lead anywhere the website will link to: ${String(r.a).slice(0, 80)}`);
    }
    const last = out[out.length - 1];
    if (last && !!last.b === !!run.b && !!last.i === !!run.i && last.a === run.a) last.x += run.x;
    else out.push(run);
  }
  // No space at either end of a block: it would show as a gap.
  if (out.length) { out[0].x = out[0].x.replace(/^ +/, ""); out[out.length - 1].x = out[out.length - 1].x.replace(/ +$/, ""); }
  return out.filter((r) => r.x);
}

/** The blocks of a body, each checked. Strict refuses what it does not know; otherwise it is left out. */
export function cleanBlocks(v: unknown, strict = true): Block[] {
  if (!Array.isArray(v)) { if (strict) throw new ArticleProblem("The article has no body the website can read."); return []; }
  if (v.length > LIMITS.blocks) { if (strict) throw new ArticleProblem(`The article is longer than ${LIMITS.blocks} paragraphs, which is more than one page should carry.`); v = v.slice(0, LIMITS.blocks); }
  const out: Block[] = [];
  let pictures = 0;
  for (const b of v as unknown[]) {
    if (!isObject(b)) { if (strict) throw new ArticleProblem("Part of the article is not in a shape the website can read."); continue; }
    if (b.t === "p" || b.t === "h" || b.t === "s" || b.t === "q") {
      const c = runs(b.c, strict);
      if (c.length) out.push({ t: b.t, c });
    } else if (b.t === "ul" || b.t === "ol") {
      const list = Array.isArray(b.items) ? b.items : [];
      if (list.length > LIMITS.items && strict) throw new ArticleProblem(`One list has more than ${LIMITS.items} points.`);
      const items = list.slice(0, LIMITS.items).map((i) => runs(i, strict)).filter((i) => i.length);
      if (items.length) out.push({ t: b.t, items });
    } else if (b.t === "hr") {
      out.push({ t: "hr" });
    } else if (b.t === "img") {
      const w = Number(b.w), h = Number(b.h);
      if (!isPictureId(b.id) || !Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 8000 || h > 8000) { if (strict) throw new ArticleProblem("A picture in the article is not one the website can show."); continue; }
      if (++pictures > LIMITS.pictures) { if (strict) throw new ArticleProblem(`The article has more than ${LIMITS.pictures} pictures.`); continue; }
      out.push({ t: "img", id: b.id, w, h, caption: line(b.caption, LIMITS.caption) });
    } else if (strict) {
      throw new ArticleProblem("Part of the article is of a kind the website does not know. The PMS and the website may be on different versions.");
    }
  }
  return out;
}

/** A whole article as it is sent to be published, checked. */
export function cleanArticle(v: unknown): ArticleIn {
  if (!isObject(v)) throw new ArticleProblem("That is not an article.");
  const sourceId = typeof v.sourceId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(v.sourceId) ? v.sourceId : "";
  if (!sourceId) throw new ArticleProblem("The article does not say which one it is.");
  const title = line(v.title, LIMITS.title + 1), standfirst = line(v.standfirst, LIMITS.standfirst + 1), summary = line(v.summary, LIMITS.summary + 1);
  if (!title) throw new ArticleProblem("The article needs a title.");
  if (title.length > LIMITS.title) throw new ArticleProblem(`The title is longer than ${LIMITS.title} characters.`);
  if (standfirst.length > LIMITS.standfirst) throw new ArticleProblem(`The line under the title is longer than ${LIMITS.standfirst} characters.`);
  if (!summary) throw new ArticleProblem("The article needs a summary: it is what the Articles page says under the title.");
  if (summary.length > LIMITS.summary) throw new ArticleProblem(`The summary is longer than ${LIMITS.summary} characters.`);
  if (!isSlug(v.slug)) throw new ArticleProblem("The address may only be lower-case letters, digits and single dashes, like hosting-on-your-own-premises.");
  if (v.slug === "read") throw new ArticleProblem("That address is one the website uses itself. Choose another.");
  if (!isDay(v.dateShown)) throw new ArticleProblem("The date shown is not a date.");
  const body = cleanBlocks(v.body, true);
  if (!body.length) throw new ArticleProblem("The article has nothing written in it yet.");
  return { sourceId, slug: v.slug, title, standfirst, summary, dateShown: v.dateShown, body };
}

/** The pictures a body uses, each once. */
export const pictureIds = (body: Block[]) => [...new Set(body.filter((b): b is Extract<Block, { t: "img" }> => b.t === "img").map((b) => b.id))];

const textOf = (c: Inline[]) => c.map((r) => r.x).join("");
/** Every word a reader reads: the line under the title, the body and the captions. */
export function wordsOf(standfirst: string, body: Block[]): number {
  const parts = [standfirst];
  for (const b of body) {
    if (b.t === "p" || b.t === "h" || b.t === "s" || b.t === "q") parts.push(textOf(b.c));
    else if (b.t === "ul" || b.t === "ol") for (const i of b.items) parts.push(textOf(i));
    else if (b.t === "img") parts.push(b.caption);
  }
  return parts.join(" ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
/** Minutes to read it, at an ordinary pace, and never less than one. */
export const readMinutes = (words: number) => Math.max(1, Math.round(words / 230));

/** A day as the site writes it: 28 November 2026. */
export function longDay(day: string): string {
  const d = new Date(day + "T12:00:00Z");
  return Number.isNaN(d.getTime()) ? day : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
