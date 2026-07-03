// The Products page. A styled placeholder in the site's ink-on-paper idiom —
// nav on top, mono kicker, italic serif headline, a quiet "in preparation" note.
// Content to be filled in later; the structure and tokens are here so it drops in
// cleanly. Reachable from the "Our products" link in the nav (always visible).

import SiteNav from "@/components/SiteNav";

export const metadata = {
  title: "Products — Reaction",
  description: "What we build at Reaction.",
};

const serif = { fontFamily: "'Newsreader', Georgia, serif" } as const;

export default function ProductsPage() {
  return (
    <>
      <SiteNav />
      <main style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center" }}>
        <div className="container">
          <div style={{ maxWidth: 720, padding: "80px 0 100px" }}>
            <div
              className="mono"
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--reaction)",
                marginBottom: 22,
              }}
            >
              Our products
            </div>

            <h1
              style={{
                ...serif,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: "0 0 26px",
              }}
            >
              The things we build<span style={{ color: "var(--reaction)" }}>.</span>
            </h1>

            <p
              style={{
                fontSize: "1.1rem",
                lineHeight: 1.7,
                color: "var(--text-soft)",
                margin: "0 0 40px",
                maxWidth: "56ch",
              }}
            >
              A closer look at the products coming out of the studio is on its way.
              This page is being put together now.
            </p>

            <div
              style={{
                borderTop: "1px solid var(--rule)",
                paddingTop: 26,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                In preparation
              </span>
              <span style={{ flex: 1, height: 1, background: "var(--rule)" }} aria-hidden="true" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
