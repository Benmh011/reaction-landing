import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Research and analysis on student engagement, wellbeing, employability, and the regulatory frameworks that shape UK higher education — from the team building Reaction.",
  openGraph: {
    title: "Insights · Reaction",
    description:
      "Research and analysis on student engagement, wellbeing, employability, and the regulatory frameworks that shape UK higher education.",
    url: "https://reaction.org.uk/insights",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Insights · Reaction",
    description:
      "Research and analysis on student engagement, wellbeing, and the frameworks that shape UK higher education.",
  },
  alternates: {
    canonical: "https://reaction.org.uk/insights",
  },
};

// Article list — currently hand-maintained. When the count grows beyond ~5-10,
// migrate to MDX or a small content registry. For now, simple array is clearest.
const articles = [
  {
    slug: "tef-and-student-experience",
    title: "TEF and student experience: what the metrics don't capture",
    excerpt:
      "The Teaching Excellence Framework measures student experience through NSS scores, continuation rates, and graduate outcomes 15 months after a student leaves. The lived experience itself — belonging, peer connection, community — sits in the gaps between those metrics. What that gap looks like, and what universities can do about it before the next round.",
    publishedAt: "2026-05-12",
    readingMinutes: 11,
  },
];

// ItemList JSON-LD helps Google understand the page as a curated list,
// not a single article. Useful for surfacing the index in search results.
const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Reaction Insights",
  description: "Research and analysis on UK higher education student experience.",
  itemListElement: articles.map((article, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://reaction.org.uk/insights/${article.slug}`,
    name: article.title,
  })),
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function InsightsIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <SiteNav />

      <section style={{ padding: "80px 0 40px" }}>
        <div className="container-narrow">
          <div className="page-eyebrow">Insights</div>
          <h1 className="page-title">
            Research, written for the <em>people who run universities</em>.
          </h1>
          <p className="page-lede">
            Long-form analysis on student experience, engagement, wellbeing, employability, and the
            regulatory frameworks that shape UK higher education. Cited, current, and written for
            Pro-VCs, students&apos; unions, and the teams behind the policy.
          </p>
        </div>
      </section>

      <section style={{ padding: "20px 0 100px" }}>
        <div className="container-narrow">
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {articles.map((article) => (
              <li
                key={article.slug}
                style={{
                  borderTop: "1px solid var(--rule)",
                  padding: "36px 0",
                }}
              >
                <Link
                  href={`/insights/${article.slug}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: "0.7rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      marginBottom: 14,
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{formatDate(article.publishedAt)}</span>
                    <span style={{ color: "var(--reaction)" }}>·</span>
                    <span>{article.readingMinutes} min read</span>
                  </div>
                  <h2
                    style={{
                      fontFamily: "'Newsreader', Georgia, serif",
                      fontStyle: "italic",
                      fontWeight: 600,
                      fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0',
                      fontSize: "clamp(1.5rem, 3vw, 2rem)",
                      lineHeight: 1.15,
                      letterSpacing: "-0.02em",
                      margin: "0 0 14px",
                      color: "var(--text)",
                    }}
                  >
                    {article.title}
                  </h2>
                  <p
                    style={{
                      fontSize: "1rem",
                      lineHeight: 1.6,
                      color: "var(--text-soft)",
                      margin: "0 0 18px",
                      maxWidth: "62ch",
                    }}
                  >
                    {article.excerpt}
                  </p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.92rem",
                      color: "var(--reaction)",
                      fontWeight: 500,
                    }}
                  >
                    Read the article
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ))}

            {/* Bottom rule to close out the final article in the list */}
            <li
              style={{
                borderTop: "1px solid var(--rule)",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
              aria-hidden="true"
            />
          </ul>

          {/* More-coming-soon hint — remove once the list has more articles */}
          <p
            className="mono"
            style={{
              fontSize: "0.78rem",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              marginTop: 40,
            }}
          >
            More articles in preparation. Sign up via{" "}
            <Link href="/demo" style={{ color: "var(--reaction)", textDecoration: "none" }}>
              the demo form
            </Link>{" "}
            and we&apos;ll let you know when they publish.
          </p>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
