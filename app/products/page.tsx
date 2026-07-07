// The Products page. Leads with Campus Connect — South Hams Reaction's engine,
// pointed at universities. Hero: the animated loop ring (the product's post ·
// RSVP · check in · reflect cycle) beside a live phone mockup, with a text
// column making the pitch. Product 02 follows: the bespoke practice management
// LMAS, shown as a self-cycling desktop frame in the third captain's green.

import SiteNav from "@/components/SiteNav";
import CampusLoop from "@/components/CampusLoop";
import CampusPhone from "@/components/CampusPhone";
import PracticeFrame from "@/components/PracticeFrame";
import PracticeBuild from "@/components/PracticeBuild";

export const metadata = {
  title: "Products — Reaction",
  description: "What we build at Reaction. Campus Connect, the community engine for universities, and the bespoke practice management LMAS — personalised workflow on infrastructure you control.",
};

const serif = { fontFamily: "'Newsreader', Georgia, serif" } as const;

const FEATURES = [
  "University-email gated — real students, no outsiders.",
  "Societies, sport and social in one filterable feed.",
  "Post, RSVP, check in, reflect — the engagement loop.",
  "Installs to the home screen. Push when it matters.",
];

const PRACTICE_FEATURES = [
  "Grounded on your own documents — and it declines when it can't cite. Every answer names its source.",
  "Every draft waits for human sign-off. Your team holds the dial.",
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

        {/* ── TEF: educational gains evidence ── */}
        <section style={{ padding: "80px 0 100px", borderTop: "1px solid var(--rule)" }} id="tef-evidence">
          <div className="container">
            <div style={{ maxWidth: 760, marginBottom: 54 }}>
              <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--reaction)", marginBottom: 16 }}>
                Evidence · TEF educational gains
              </div>
              <h2 style={{ ...serif, fontStyle: "italic", fontWeight: 600, fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--text)", margin: "0 0 20px" }}>
                Distance travelled<span style={{ color: "var(--reaction)" }}>.</span>
              </h2>
              <p style={{ fontSize: "1.06rem", lineHeight: 1.7, color: "var(--text-soft)", margin: "0 0 14px", maxWidth: "62ch" }}>
                The Teaching Excellence Framework asks providers not just to intend educational
                gains, but to evidence them, and confidence and personal development sit squarely
                inside its definition. The catch is that these gains have no nationally comparable
                dataset, so providers must find their own defensible evidence.
              </p>
              <p style={{ fontSize: "1.06rem", lineHeight: 1.7, color: "var(--text-soft)", margin: 0, maxWidth: "62ch" }}>
                Campus Connect produces exactly that. Every student&rsquo;s journey up a ladder of
                growing confidence, from watching, to taking part, to leading, is captured as
                longitudinal behavioural data. Not a survey of opinion; a record of what students
                actually did, term over term.
              </p>
            </div>

            {/* the confidence ladder */}
            <div className="tef-ladder" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 44 }}>
              {[
                { n: "01", stage: "Observer", color: "#c93a17", body: "Signs in, browses the feed, sees what campus life offers. The starting line: present, but on the edge." },
                { n: "02", stage: "Participant", color: "#2565aa", body: "RSVPs, checks in, turns up. The first measurable step of the distance travelled, and the confidence behind it." },
                { n: "03", stage: "Organiser", color: "#0d5a40", body: "Posts an event, runs a society, brings others in. Leadership and work readiness, evidenced by action." },
              ].map((step, i) => (
                <div key={step.n} style={{ position: "relative", padding: "26px 24px", background: "var(--paper-2, #fdfbf5)", border: "1px solid var(--rule)", borderRadius: 14, borderTop: `3px solid ${step.color}` }}>
                  <div className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.14em", color: step.color, marginBottom: 10 }}>{step.n}</div>
                  <div style={{ ...serif, fontStyle: "italic", fontWeight: 600, fontSize: "1.35rem", color: "var(--text)", marginBottom: 10 }}>{step.stage}</div>
                  <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-soft)", margin: 0 }}>{step.body}</p>
                  {i < 2 && (
                    <span aria-hidden="true" className="tef-arrow" style={{ position: "absolute", right: -16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "1.1rem", zIndex: 1 }}>&rarr;</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 26, borderTop: "1px solid var(--rule)" }}>
              <div style={{ flex: "1 1 240px" }}>
                <div className="mono" style={{ fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                  The conversion metric
                </div>
                <p style={{ fontSize: "0.96rem", lineHeight: 1.6, color: "var(--text-soft)", margin: 0 }}>
                  The observer-to-participant-to-organiser conversion rate becomes a headline
                  figure a provider can put in front of the TEF panel: a cohort growing in
                  confidence, tracked in the aggregate, term over term.
                </p>
              </div>
              <div style={{ flex: "1 1 240px" }}>
                <div className="mono" style={{ fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                  Kept honest
                </div>
                <p style={{ fontSize: "0.96rem", lineHeight: 1.6, color: "var(--text-soft)", margin: 0 }}>
                  TEF sets social experience aside; the evidence here is personal development and
                  work readiness, the distance a student travels toward leading. That is the gain
                  the framework asks providers to prove.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bespoke practice management LMAS ── */}
        <section style={{ padding: "80px 0 110px", borderTop: "1px solid var(--rule)" }} id="practice-lmas">
          <div className="container">
            {/* header */}
            <div style={{ maxWidth: 760, marginBottom: 48 }}>
              <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
                Product 02 · for working practices
              </div>
              <h2 style={{ ...serif, fontStyle: "italic", fontWeight: 600, fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)", lineHeight: 1.08, letterSpacing: "-0.02em", color: "var(--text)", margin: 0 }}>
                Bespoke practice management LMAS<span style={{ color: "var(--reaction)" }}>.</span>
              </h2>
            </div>

            {/* dual hero: the frame, the orbit at its side */}
            <div className="practice-hero" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 64, alignItems: "center", marginBottom: 56 }}>
              <div className="practice-visual">
                <PracticeFrame />
              </div>
              <PracticeBuild />
            </div>

            {/* the pitch, beneath the pair */}
            <div className="practice-copy" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 64, alignItems: "start", paddingTop: 36, borderTop: "1px solid var(--rule)" }}>
              <p style={{ fontSize: "1.08rem", lineHeight: 1.7, color: "var(--text-soft)", margin: 0, maxWidth: "56ch" }}>
                A formation of small, specialised agents fitted to one practice: yours.
                It learns the way your firm actually runs — the diary, the documents,
                the sign-offs — and works inside it, on infrastructure you control.
                Maximum personalised workflow; total data sovereignty.
              </p>
              <div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 26px", display: "flex", flexDirection: "column", gap: 13 }}>
                  {PRACTICE_FEATURES.map((f) => (
                    <li key={f} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: "0.98rem", lineHeight: 1.5, color: "var(--text-soft)" }}>
                      <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 7, width: 7, height: 7, borderRadius: "50%", background: "#0d5a40" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Built per practice · no two the same
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .campus-grid { grid-template-columns: 1fr !important; gap: 44px !important; }
          .campus-visual { grid-template-columns: 1fr !important; gap: 36px !important; justify-items: center; }
          .practice-hero { grid-template-columns: 1fr !important; gap: 44px !important; justify-items: center; }
          .practice-copy { grid-template-columns: 1fr !important; gap: 28px !important; }
          .tef-ladder { grid-template-columns: 1fr !important; gap: 28px !important; }
          .tef-arrow { display: none !important; }
        }
      `}</style>
    </>
  );
}
