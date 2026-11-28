import type { ReactNode } from "react";
import type { Block, Inline } from "@/lib/articleBlocks";

// An article's body, built from its blocks (lib/articleBlocks.ts). Every
// element here is made by this file from a known kind of block; nothing an
// author typed is ever put on the page as markup.

const SERIF = "'Newsreader', Georgia, serif";

function runs(c: Inline[]): ReactNode[] {
  return c.map((r, i) => {
    let node: ReactNode = r.x;
    if (r.b) node = <strong>{node}</strong>;
    if (r.i) node = <em>{node}</em>;
    if (r.a) {
      const outside = /^https?:\/\//i.test(r.a);
      node = <a href={r.a} className="art-link" {...(outside ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{node}</a>;
    }
    return <span key={i}>{node}</span>;
  });
}

export default function ArticleBody({ body }: { body: Block[] }) {
  return (
    <div className="art-body">
      {body.map((b, i) => {
        switch (b.t) {
          case "p": return <p key={i}>{runs(b.c)}</p>;
          case "h": return <h2 key={i}>{runs(b.c)}</h2>;
          case "s": return <h3 key={i}>{runs(b.c)}</h3>;
          case "q": return <blockquote key={i}>{runs(b.c)}</blockquote>;
          case "ul": return <ul key={i}>{b.items.map((item, n) => <li key={n}>{runs(item)}</li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((item, n) => <li key={n}>{runs(item)}</li>)}</ol>;
          case "hr": return <hr key={i} />;
          case "img": return (
            <figure key={i}>
              {/* The picture's own size is given so the page does not jump as it loads. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/articles/image?id=${b.id}`} width={b.w} height={b.h} alt={b.caption} loading="lazy" decoding="async" />
              {b.caption && <figcaption>{b.caption}</figcaption>}
            </figure>
          );
          default: return null;
        }
      })}
    </div>
  );
}

/** The styles of the Articles pages, kept with them so nothing else on the site is touched. */
export const ARTICLE_CSS = `
.art-wrap { max-width: 1136px; margin: 0 auto; padding: 0 40px; position: relative; z-index: 2; }
.art-serif { font-family: ${SERIF}; font-variation-settings: "opsz" 72; }
.art-meta { font-size: 0.82rem; color: var(--text-muted); }
.art-index-title { font-weight: 500; font-size: clamp(2.4rem, 6vw, 3.5rem); letter-spacing: -0.02em; line-height: 1.05; margin: 0; color: var(--text); }
.art-list { margin-top: 56px; border-top: 1px solid var(--rule-strong); }
.art-row { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 40px; padding: 34px 0; border-bottom: 1px solid var(--rule); text-decoration: none; color: inherit; }
.art-row h2 { font-weight: 500; font-size: clamp(1.5rem, 3.4vw, 1.95rem); letter-spacing: -0.012em; line-height: 1.15; margin: 0; color: var(--text); transition: color 0.2s; }
.art-row:hover h2 { color: var(--reaction); }
.art-row p { margin: 12px 0 0; font-size: 1.04rem; line-height: 1.65; color: var(--text-soft); max-width: 62ch; }
.art-row .art-meta { padding-top: 8px; }
.art-none { margin-top: 56px; padding-top: 34px; border-top: 1px solid var(--rule-strong); color: var(--text-muted); }
.art-page { max-width: 860px; }
.art-back { text-decoration: none; }
.art-back:hover { color: var(--text); }
.art-title { font-weight: 500; font-size: clamp(2.2rem, 6vw, 3.3rem); letter-spacing: -0.02em; line-height: 1.06; margin: 14px 0 0; max-width: 19ch; color: var(--text); }
.art-stand { font-size: clamp(1.2rem, 2.6vw, 1.42rem); line-height: 1.45; color: var(--text-soft); margin: 22px 0 0; max-width: 40ch; }
.art-body { margin-top: 44px; font-size: 1.075rem; line-height: 1.75; color: var(--text); max-width: 64ch; }
.art-body p { margin: 0 0 20px; }
.art-body h2 { font-family: ${SERIF}; font-variation-settings: "opsz" 72; font-weight: 500; font-size: 1.8rem; letter-spacing: -0.01em; line-height: 1.2; margin: 40px 0 16px; color: var(--text); }
.art-body h3 { font-family: ${SERIF}; font-variation-settings: "opsz" 72; font-weight: 500; font-size: 1.35rem; letter-spacing: -0.005em; line-height: 1.25; margin: 32px 0 12px; color: var(--text); }
.art-body ul, .art-body ol { margin: 0 0 20px; padding-left: 22px; }
.art-body ul { list-style: disc; }
.art-body ol { list-style: decimal; }
.art-body li { margin-bottom: 8px; }
.art-body blockquote { font-family: ${SERIF}; font-variation-settings: "opsz" 72; margin: 34px 0; padding-left: 22px; border-left: 3px solid var(--reaction); font-size: 1.5rem; line-height: 1.4; color: var(--text); }
.art-body hr { border: 0; border-top: 1px solid var(--rule-strong); margin: 40px 0; }
.art-body figure { margin: 32px 0; }
.art-body figure img { display: block; max-width: 100%; height: auto; border-radius: 3px; }
.art-body figcaption { margin-top: 10px; font-size: 0.82rem; color: var(--text-muted); }
.art-link { color: inherit; text-decoration: underline; text-decoration-color: var(--reaction); text-underline-offset: 3px; text-decoration-thickness: 1.5px; }
.art-link:hover { color: var(--reaction); }
@media (max-width: 760px) {
  .art-wrap { padding: 0 22px; }
  .art-row { grid-template-columns: 1fr; gap: 6px; padding: 26px 0; }
  .art-row .art-meta { padding-top: 0; }
  .art-row .art-meta br { display: none; }
  .art-row .art-meta span + span::before { content: " · "; }
  .art-body blockquote { font-size: 1.3rem; }
}
`;
