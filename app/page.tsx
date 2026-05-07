import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

// Inline-style helper so we can reuse the design tokens without spinning up Tailwind
const display = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontStyle: "italic",
  fontWeight: 600,
  fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
  letterSpacing: "-0.025em",
} as const;

export default function HomePage() {
  return (
    <>
      <SiteNav />

      {/* HERO */}
      <section style={{ padding: "120px 0 100px" }} id="top">
        <div className="container">
          <div className="page-eyebrow" style={{ marginBottom: 32 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
                animation: "pulse 2.4s infinite",
                marginLeft: -10,
              }}
            />{" "}
            University software · for student connection
          </div>

          <h1
            style={{
              ...display,
              fontSize: "clamp(2.4rem, 6.5vw, 5.4rem)",
              lineHeight: 0.98,
              maxWidth: "18ch",
              margin: "0 0 32px",
              color: "var(--text)",
            }}
          >
            Every <em style={{ color: "var(--reaction)" }}>action</em> has an equal and opposite{" "}
            <em style={{ color: "var(--reaction)" }}>reaction</em>.
          </h1>

          <div
            className="mono"
            style={{ fontSize: "0.78rem", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 44 }}
          >
            — Sir Isaac Newton, 1687
          </div>

          <p
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 500,
              fontVariationSettings: '"opsz" 48, "SOFT" 0, "WONK" 0',
              fontSize: "clamp(1.3rem, 2.4vw, 1.85rem)",
              lineHeight: 1.32,
              letterSpacing: "-0.015em",
              maxWidth: "32ch",
              margin: "0 0 22px",
            }}
          >
            <span className="reaction-mark">Reaction</span> is a university platform that connects students on and off
            campus.
          </p>

          <p
            style={{
              fontSize: "clamp(1.05rem, 1.45vw, 1.15rem)",
              lineHeight: 1.6,
              maxWidth: "56ch",
              color: "var(--text-soft)",
              margin: "0 0 44px",
            }}
          >
            The action you put in — joining, going, applying, showing up — sets up the reaction that takes you
            somewhere new.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href="/demo" className="btn btn-primary btn-large">
              Book a demo
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="#what" className="btn btn-ghost btn-large">
              What we do
            </Link>
          </div>
        </div>
      </section>

      {/* MANTRA */}
      <section
        style={{
          padding: "100px 0",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg-surface)",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: 80,
              alignItems: "start",
            }}
            className="mantra-grid"
          >
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", paddingTop: 12, position: "relative" }}>
              <span style={{ position: "absolute", top: 0, left: 0, width: 32, height: 1, background: "var(--reaction)" }} />
              The mantra
            </div>
            <div>
              {[
                <>At university, Newton's third law isn't just physics. It's a way to think about the three years that change everything.</>,
                <>The <em style={{ color: "var(--reaction)", fontStyle: "italic" }}>action</em> you take — joining the society, going to the careers event, signing up to volunteer, asking the question — sets up a reaction. A connection. An opportunity. A version of you that didn't exist last term.</>,
                <><span className="reaction-mark" style={{ fontSize: "1.05em" }}>Reaction</span> is built around that idea. Put in the action. Set yourself up.</>,
              ].map((p, i, arr) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontWeight: 500,
                    fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0',
                    fontSize: "clamp(1.4rem, 2.4vw, 1.85rem)",
                    lineHeight: 1.32,
                    letterSpacing: "-0.015em",
                    color: "var(--text)",
                    margin: i === arr.length - 1 ? 0 : "0 0 1em",
                  }}
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section style={{ padding: "100px 0" }} id="what">
        <div className="container">
          <header
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: 80,
              marginBottom: 64,
              alignItems: "end",
            }}
            className="mantra-grid"
          >
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", paddingTop: 12, position: "relative" }}>
              <span style={{ position: "absolute", top: 0, left: 0, width: 32, height: 1, background: "var(--reaction)" }} />
              What it does
            </div>
            <h2
              style={{
                ...display,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.05,
                margin: 0,
                color: "var(--text)",
              }}
            >
              One platform for everything <em style={{ color: "var(--reaction)" }}>around</em> a university degree.
            </h2>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              background: "var(--rule)",
              border: "1px solid var(--rule)",
              borderRadius: 16,
              overflow: "hidden",
            }}
            className="pillars-grid"
          >
            {[
              { num: "01 · ON CAMPUS", h: "Find your people", p: "Sport, study, socials, and games — everything that makes university more than lectures. Built for the days you don't want to walk into the gym alone." },
              { num: "02 · OFF CAMPUS", h: "Get involved", p: "Volunteering, fundraising, social events, and campaigns — from local charities and community groups looking for student energy." },
              { num: "03 · WHAT'S NEXT", h: "Set yourself up", p: "Part-time work, summer internships, graduate schemes — and the people, employers and partners that turn three years of study into a head start." },
            ].map((p) => (
              <div key={p.num} style={{ background: "var(--bg)", padding: "36px 32px 40px" }}>
                <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--reaction)", marginBottom: 28 }}>
                  {p.num}
                </div>
                <h3
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontWeight: 600,
                    fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0',
                    fontSize: "1.5rem",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.15,
                    margin: "0 0 14px",
                    color: "var(--text)",
                  }}
                >
                  {p.h}
                </h3>
                <p style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "var(--text-soft)", margin: 0 }}>{p.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO CTA */}
      <section style={{ padding: "120px 0 100px", borderTop: "1px solid var(--rule)", textAlign: "center" }} id="demo">
        <div className="container">
          <h2
            style={{
              ...display,
              fontSize: "clamp(2.2rem, 4.5vw, 3.6rem)",
              lineHeight: 1.05,
              margin: "0 auto 24px",
              color: "var(--text)",
              maxWidth: "22ch",
            }}
          >
            Bring <span className="reaction-mark">Reaction</span> to your{" "}
            <em style={{ color: "var(--reaction)" }}>students</em>.
          </h2>
          <p style={{ maxWidth: "52ch", margin: "0 auto 44px", color: "var(--text-soft)", fontSize: "1.05rem" }}>
            We're working with universities and students' unions to put Reaction in the hands of the students who need
            it. If you'd like to see how it works in practice — get in touch.
          </p>
          <div style={{ display: "inline-flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/demo" className="btn btn-primary btn-large">
              Book a demo
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </div>
          <div
            className="mono"
            style={{
              marginTop: 56,
              fontSize: "0.78rem",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
            }}
          >
            <a href="mailto:info@reaction.org.uk" style={{ color: "var(--text-soft)", textDecoration: "none" }}>
              info@reaction.org.uk
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 60%, transparent); }
          50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 0%, transparent); }
        }
        @media (max-width: 760px) {
          .mantra-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .pillars-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
