import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ArticleBody, { ARTICLE_CSS } from "@/components/ArticleBody";
import { getArticle } from "@/lib/articles";
import { longDay } from "@/lib/articleBlocks";

// One article. Its address is /articles/<its address>: next.config.js sends
// that here with the address as ?slug=, so this folder needs no name in
// square brackets. An address nothing is published at is an ordinary 404.

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ slug?: string | string[] }> };
const slugOf = async (p: Props) => {
  const s = (await p.searchParams).slug;
  return typeof s === "string" ? s : "";
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const a = await getArticle(await slugOf(props));
  if (!a) return { title: "Articles", robots: { index: false } };
  const url = `https://reaction.org.uk/articles/${a.slug}`;
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: url },
    openGraph: { title: a.title, description: a.summary, url, type: "article", publishedTime: a.dateShown, modifiedTime: a.updatedAt },
    twitter: { card: "summary_large_image", title: a.title, description: a.summary },
  };
}

export default async function ArticlePage(props: Props) {
  const a = await getArticle(await slugOf(props));
  if (!a) notFound();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ARTICLE_CSS }} />
      <SiteNav />
      <main>
        <article style={{ padding: "76px 0 20px" }}>
          <div className="art-wrap art-page">
            <Link href="/articles" className="art-meta art-back">← Articles</Link>
            <div className="art-meta" style={{ marginTop: 34 }}>
              {longDay(a.dateShown)} · {a.readMinutes} minute read
            </div>
            <h1 className="art-serif art-title">{a.title}</h1>
            {a.standfirst && <p className="art-serif art-stand">{a.standfirst}</p>}
            <ArticleBody body={a.body} />
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
