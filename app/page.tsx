import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

// Inline-style helper so we can reuse the design tokens without spinning up Tailwind
const display = {
  fontFamily: "'Newsreader', Georgia, serif",
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
          <div className="page-eyebrow" style={{ marginBottom: 32, fontWeight: 600, color: "var(--text-soft)" }}>
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
            University software - student engagement, experience, employability
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
            <em style={{ color: "var(--reaction)" }}>Reaction</em>.
          </h1>

          <div
            className="mono"
            style={{ fontSize: "0.78rem", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 44 }}
          >
            — Sir Isaac Newton, 1687
          </div>

          <p
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontWeight: 500,
              fontVariationSettings: '"opsz" 48, "SOFT" 0, "WONK" 0',
              fontSize: "clamp(1.3rem, 2.4vw, 1.85rem)",
              lineHeight: 1.32,
              letterSpacing: "-0.015em",
              maxWidth: "32ch",
              margin: "0 0 22px",
            }}
          >
            A university platform that connects students on and off
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
            When a <span style={{ color: "var(--reaction)" }}>student</span> chooses your university, they're taking positive action towards their future - make sure you give them the best <span style={{ color: "var(--reaction)" }}>Reaction</span> possible.
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
          background: "var(--reaction-deep)",
        }}
      >
        <div className="container">

          <header style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "block", width: 32, height: 1, background: "var(--bg)", margin: "0 auto 18px" }} />
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--bg)", marginBottom: 24 }}>
              The mission
            </div>
            <h3
              style={{
                ...display,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.15,
                color: "var(--bg)",
                margin: "0 auto",
                maxWidth: "22ch",
              }}
            >
              Our platform is a <span className="reaction-mark" style={{ color: "var(--bg)" }}>Reaction</span> to pressing student issues.
            </h3>
          </header>

          <div>
            <div>
              {[
                {
                  num: "01",
                  h: "Student loneliness",
                  p: "53% of students feel uncomfortable seeking help for loneliness",
                  href: "https://www.gov.uk/government/news/new-government-research-shows-lonely-seems-to-be-the-hardest-word-for-students",
                  label: "Source: GOV.UK – government research on student loneliness",
                },
                {
                  num: "02",
                  h: "Drinking culture",
                  p: "77% of students agree that they drink alcohol primarily to fit in with their peers",
                  href: "https://www.drugandalcoholimpact.uk/news/the-latest-student-behaviors-and-perspectives-of-alcohol-and-drugs-in-higher-education",
                  label: "Source: Drug and Alcohol Impact – student behaviours and perspectives",
                },
                {
                  num: "03",
                  h: "Career crisis",
                  p: "56% of students aren't confident of finding employment after graduation",
                  href: "https://www.savethestudent.org/money/surveys/student-money-survey-2025-results.html",
                  label: "Source: Save the Student – Student Money Survey 2025",
                },
              ].map((row, i, arr) => (
                <div
                  key={row.num}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr",
                    gap: 32,
                    padding: "36px 0",
                    borderTop: "1px solid rgba(225,228,232,0.22)",
                    borderBottom: i === arr.length - 1 ? "1px solid rgba(225,228,232,0.22)" : "none",
                  }}
                >
                  <div className="mono" style={{ color: "var(--bg)", fontSize: "0.7rem", letterSpacing: "0.1em", paddingTop: 10 }}>
                    {row.num}
                  </div>
                  <div>
                    <h4
                      style={{
                        fontFamily: "'Newsreader', Georgia, serif",
                        fontWeight: 600,
                        fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0',
                        fontSize: "1.5rem",
                        letterSpacing: "-0.015em",
                        lineHeight: 1.15,
                        margin: "0 0 12px",
                        color: "var(--bg)",
                      }}
                    >
                      {row.h}
                    </h4>
                    <p style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "rgba(225,228,232,0.82)", margin: 0, maxWidth: "54ch" }}>
                      {row.p}{" "}
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={row.label}
                        style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 6, color: "var(--bg)", textDecoration: "none" }}
                      >
                        <svg width="0.7em" height="0.7em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M7 17L17 7" />
                          <path d="M7 7h10v10" />
                        </svg>
                      </a>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* WHAT WE DO */}
      <section style={{ padding: "100px 0", background: "#e1e4e8" }} id="what">
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
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#4a443c", paddingTop: 12, position: "relative" }}>
              <span style={{ position: "absolute", top: 0, left: 0, width: 32, height: 1, background: "#4d6f99" }} />
              What it does
            </div>
            <h2
              style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                margin: 0,
                color: "#000000",
              }}
            >
              One platform for everything <em style={{ color: "#4d6f99", fontStyle: "italic" }}>around</em> a university degree.
            </h2>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              background: "#aab0b6",
              border: "1px solid #aab0b6",
              borderRadius: 16,
              overflow: "hidden",
            }}
            className="pillars-grid"
          >
            {[
              { num: "01 · ON CAMPUS", h: "Find your people", p: "From study groups to societies, board games to basketball matches; Reaction provides an easy, responsive way of making social connections on campus. No photo sharing, no follower counts, no toxic lifestyle comparisons - just new people trying new things, together." },
              { num: "02 · OFF CAMPUS", h: "Get involved", p: "A place for your students to give their energy to a cause that matters to them, with listings from local charities and community groups looking for a helping hand" },
              { num: "03 · WHAT'S NEXT", h: "Set yourself up", p: "Part-time work, summer internships, graduate schemes — and the people, employers and partners that turn three years of study into a head start." },
            ].map((p) => (
              <div key={p.num} style={{ background: "#ffffff", padding: "36px 32px 40px" }}>
                <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#4d6f99", marginBottom: 28 }}>
                  {p.num}
                </div>
                <h3
                  style={{
                    fontFamily: "'Newsreader', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "1.5rem",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.15,
                    margin: "0 0 14px",
                    color: "#000000",
                  }}
                >
                  {p.h}
                </h3>
                <p style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "#333333", margin: 0 }}>{p.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR UNIVERSITIES */}
      <section style={{ padding: "100px 0", borderTop: "1px solid var(--rule)" }} id="for-universities">
        <div className="container">
          <header style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "block", width: 32, height: 1, background: "var(--reaction)", margin: "0 auto 18px" }} />
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 24 }}>
              For universities
            </div>
            <h2
              style={{
                ...display,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.15,
                margin: "0 auto",
                maxWidth: "22ch",
                color: "var(--text)",
              }}
            >
              Data your student experience team can't <em style={{ color: "var(--reaction)" }}>currently</em> capture.
            </h2>
          </header>

          <div>
            <div>
              {[
                { num: "01", h: "Peer connection data, ready for TEF", p: "Evidence of belonging, peer-led learning, and sense of community — formatted for Teaching Excellence Framework narrative submissions and ready when you need it." },
                { num: "02", h: "Engagement gaps, visible", p: "Real-time data on which cohorts are connecting — broken down by demographic so your Access & Participation Plan has the proof points it needs." },
                { num: "03", h: "Belonging to outcomes", p: "Integrate with your student records to track which peer-connection patterns actually improve second-year continuation rates." },
                { num: "04", h: "Career engagement to graduate outcomes", p: "Track which cohorts are engaging with internships, part-time roles, and graduate schemes through Reaction. Direct evidence for the TEF Student Outcomes pillar, and useful context for your Graduate Outcomes survey results." },
              ].map((row, i, arr) => (
                <div
                  key={row.num}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr",
                    gap: 32,
                    padding: "36px 0",
                    borderTop: "1px solid var(--rule)",
                    borderBottom: i === arr.length - 1 ? "1px solid var(--rule)" : "none",
                  }}
                >
                  <div className="mono" style={{ color: "var(--reaction)", fontSize: "0.7rem", letterSpacing: "0.1em", paddingTop: 10 }}>
                    {row.num}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontFamily: "'Newsreader', Georgia, serif",
                        fontWeight: 600,
                        fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0',
                        fontSize: "1.5rem",
                        letterSpacing: "-0.015em",
                        lineHeight: 1.15,
                        margin: "0 0 12px",
                        color: "var(--text)",
                      }}
                    >
                      {row.h}
                    </h3>
                    <p style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "var(--text-soft)", margin: 0, maxWidth: "54ch" }}>
                      {row.p}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
