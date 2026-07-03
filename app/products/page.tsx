// The Products page. Leads with Campus Connect — South Hams Reaction's engine,
// pointed at universities. Hero: the animated loop ring (the product's post ·
// RSVP · check in · reflect cycle) beside a live phone mockup, with a text
// column making the pitch. More products can be added as sections below.

import SiteNav from "@/components/SiteNav";
import CampusLoop from "@/components/CampusLoop";
import CampusPhone from "@/components/CampusPhone";

export const metadata = {
  title: "Products — Reaction",
  description: "What we build at Reaction. Campus Connect: the community engine for universities.",
};

const serif = { fontFamily: "'Newsreader', Georgia, serif" } as const;

const FEATURES = [
  "University-email gated — real students, no outsiders.",
  "Societies, sport and social in one filterable feed.",
  "Post, RSVP, check in, reflect — the engagement loop.",
  "Installs to the home screen. Push when it matters.",
];

export default function ProductsPage() {
  return (
    <>
      <SiteNav />
      <main>
        {/* ── Page header ── */}
        <section style={{ padding: "70px 0 20px" }}>
          <div className="container">
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--reaction)", marginBottom: 18 }}>
              Our products
            </div>
            <h1 style={{ ...serif, fontStyle: "italic", fontWeight: 600, fontSize: "clamp(2.2rem, 4.6vw, 3.4rem)", lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--text)", margin: 0 }}>
              The things we build<span style={{ color: "var(--reaction)" }}>.</span>
            </h1>
          </div>
        </section>

        {/* ── Campus Connect ── */}
        <section style={{ padding: "50px 0 100px", borderTop: "1px solid var(--rule)", marginTop: 30 }} id="campus-connect">
          <div className="container">
            <div className="campus-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
              {/* left: pitch */}
              <div style={{ maxWidth: 480 }}>
                <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
                  Product 01 · for universities
                </div>
                <h2 style={{ ...serif, fontStyle: "italic", fontWeight: 600, fontSize: "clamp(2rem, 3.6vw, 2.9rem)", lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--text)", margin: "0 0 20px" }}>
                  Campus Connect<span style={{ color: "var(--reaction)" }}>.</span>
                </h2>
                <p style={{ fontSize: "1.08rem", lineHeight: 1.7, color: "var(--text-soft)", margin: "0 0 28px", maxWidth: "52ch" }}>
                  A community engine for university life. Every society, team and social
                  in one place, gated to real students by their university email, and
                  built around a single loop that turns a listing into a turnout.
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 13 }}>
                  {FEATURES.map((f) => (
                    <li key={f} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: "0.98rem", lineHeight: 1.5, color: "var(--text-soft)" }}>
                      <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 7, width: 7, height: 7, borderRadius: "50%", background: "var(--reaction)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", paddingTop: 20, borderTop: "1px solid var(--rule)" }}>
                  Proven in South Devon · adapting for campus
                </div>
              </div>

              {/* right: the loop + phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }} className="campus-visual">
                <CampusLoop />
                <CampusPhone />
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .campus-grid { grid-template-columns: 1fr !important; gap: 44px !important; }
          .campus-visual { grid-template-columns: 1fr !important; gap: 36px !important; justify-items: center; }
        }
      `}</style>
    </>
  );
}
