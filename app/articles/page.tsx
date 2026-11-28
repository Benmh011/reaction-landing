import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { ARTICLE_CSS } from "@/components/ArticleBody";
import { listArticles } from "@/lib/articles";
import { longDay } from "@/lib/articleBlocks";

// /articles — everything published, newest first. Articles are written in
// Reaction's PMS and published from there; this page only reads them.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Articles",
  description: "Articles from Reaction on building and running software for small firms: hosting, data, automation and the decisions behind them.",
  alternates: { canonical: "https://reaction.org.uk/articles" },
  openGraph: { title: "Articles · Reaction", url: "https://reaction.org.uk/articles", type: "website" },
};

export default async function ArticlesPage() {
  const articles = await listArticles();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ARTICLE_CSS }} />
      <SiteNav />
      <main>
        <section style={{ padding: "84px 0 30px" }}>
          <div className="art-wrap">
            <h1 className="art-serif art-index-title">
              Articles<span style={{ color: "var(--reaction)" }}>.</span>
            </h1>
            {articles.length === 0 ? (
              <p className="art-none">Nothing published yet.</p>
            ) : (
              <div className="art-list">
                {articles.map((a) => (
                  <Link key={a.slug} href={`/articles/${a.slug}`} className="art-row">
                    <div className="art-meta">
                      <span>{longDay(a.dateShown)}</span>
                      <br />
                      <span>{a.readMinutes} minute read</span>
                    </div>
                    <div>
                      <h2 className="art-serif">{a.title}</h2>
                      <p>{a.summary}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
