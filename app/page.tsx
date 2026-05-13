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
            <Link
              href="/portal"
              className="btn btn-outlined btn-large"
            >
              Launch demo
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
                    <p style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "rgba(225,228,232,0.82)", margin: 0 }}>
                      {/* Split the last word off so we can bind it to the SVG with a no-wrap wrapper.
                          This guarantees the icon never wraps alone — at minimum one word precedes it. */}
                      {row.p.replace(/\s+\S+$/, "")}{" "}
                      <span style={{ whiteSpace: "nowrap" }}>
                        {row.p.match(/\S+$/)?.[0]}
                        <a
                          href={row.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={row.label}
                          style={{ display: "inline-block", verticalAlign: "baseline", marginLeft: 8, color: "var(--bg)", textDecoration: "none", lineHeight: 1 }}
                        >
                          <svg width="0.85em" height="0.85em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline", verticalAlign: "baseline" }}>
                            <path d="M7 17L17 7" />
                            <path d="M7 7h10v10" />
                          </svg>
                        </a>
                      </span>
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
              <div key={p.num} style={{ background: "#e1e4e8", padding: "36px 32px 40px" }}>
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

      {/* BUILT IN TANDEM */}
      <section
        style={{
          padding: "100px 0",
          background: "var(--reaction-deep)",
        }}
        id="built-in-tandem"
      >
        <div className="container" style={{ maxWidth: 880, margin: "0 auto" }}>

          <header style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "block", width: 32, height: 1, background: "var(--bg)", margin: "0 auto 18px" }} />
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--bg)", marginBottom: 24 }}>
              Who builds it
            </div>
            <h2
              style={{
                ...display,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.15,
                color: "var(--bg)",
                margin: "0 auto",
                maxWidth: "22ch",
              }}
            >
              Reaction is built in <em style={{ fontStyle: "italic", color: "var(--bg)", opacity: 0.85 }}>tandem</em>.
            </h2>
            <p
              style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontWeight: 600,
                fontSize: "1.15rem",
                lineHeight: 1.5,
                color: "var(--bg)",
                opacity: 0.82,
                maxWidth: "48ch",
                margin: "32px auto 0",
              }}
            >
              Good software starts with understanding the problem. We work with developers who take that seriously.
            </p>
          </header>

          <div
            className="tandem-pillars"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 28,
              marginBottom: 56,
            }}
          >
            {[
              { h: "Craft over code volume", p: "The team behind Reaction's engineering treats every feature as something universities will rely on. Considered architecture, polished interfaces, production-grade code." },
              { h: "Built for the real world", p: "Tandem's work spans the Department for Education, Skills England, University of Warwick, and Gatsby Foundation. Public-facing platforms that have to work, for people who depend on them." },
              { h: "Two developers, end to end", p: "From discovery through deployment, the people you'd brief are the people building Reaction. No handoffs, no diluted vision, no third-party drift between scope and ship." },
            ].map((pillar) => (
              <div
                key={pillar.h}
                style={{
                  background: "rgba(225,228,232,0.04)",
                  border: "1px solid rgba(225,228,232,0.22)",
                  borderRadius: 10,
                  padding: "24px 22px",
                }}
              >
                <div className="mono" style={{ color: "var(--bg)", fontSize: "0.875rem", marginBottom: 14, lineHeight: 1 }}>
                  ■
                </div>
                <h3
                  style={{
                    fontFamily: "'Newsreader', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.25,
                    margin: "0 0 10px",
                    color: "var(--bg)",
                  }}
                >
                  {pillar.h}
                </h3>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.55, color: "var(--bg)", opacity: 0.78, margin: 0 }}>
                  {pillar.p}
                </p>
              </div>
            ))}
          </div>

          {/* Engineering partner credit */}
          <div
            style={{
              borderTop: "1px solid rgba(225,228,232,0.22)",
              paddingTop: 32,
              textAlign: "center",
            }}
          >
            <div className="mono" style={{ fontSize: "0.625rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--bg)", opacity: 0.7, marginBottom: 14 }}>
              Engineering partner
            </div>
            <div style={{ display: "inline-flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
              <span
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontStyle: "italic",
                  fontSize: "1.6rem",
                  color: "var(--bg)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                Tandem
              </span>
              <a
                href="https://runintandem.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Tandem Creative Dev (opens in a new tab)"
                className="tandem-credit-link"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--bg)",
                  textDecoration: "none",
                }}
              >
                {/* External-link icon: arrow leaving a box. Semantically signals "opens elsewhere". */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M14 5h5v5" />
                  <path d="M19 5l-9 9" />
                  <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                </svg>
              </a>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--bg)", opacity: 0.6 }}>
              Creative development · London
            </div>
          </div>

        </div>
      </section>

      {/* FOR EMPLOYERS */}
      <section style={{ padding: "100px 0", borderTop: "1px solid var(--rule)" }} id="for-employers">
        <div className="container">
          <header style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "block", width: 32, height: 1, background: "var(--reaction)", margin: "0 auto 18px" }} />
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 24 }}>
              For employers
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
              The talent pipeline already <em style={{ color: "var(--reaction)" }}>lives</em> on campus.
            </h2>
          </header>

          <div>
            <div>
              {[
                { num: "01", h: "Reach the universities you choose", p: "Internships, placement years, graduate schemes, part-time roles, all shared directly to our student opportunity boards - advertise to one university, or many, with our tailored posting feature" },
                { num: "02", h: "Applications, your way", p: "Local businesses can review applications inside Reaction, with each applicant's cover letter and CV in one place. Large employer? link your own application portal directly to posts  — students get routed to your existing application flow, no migration needed." },
                { num: "03", h: "Local business? local discounts", p: "If you're a local business, you'll receive a discount when advertising opportunities at local universities. Visibility metrics on every post: views, applicants, response rates. See which posts are live, and which are still waiting for the right Reaction." },
                { num: "04", h: "Craft a presence with the next cohort", p: "Every post is an impression with engaged, employment-curious students at the universities you care about. Build employer brand recognition years before students start job-hunting." },
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
        .tandem-credit-link {
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
        .tandem-credit-link:hover {
          opacity: 1;
        }
        @media (max-width: 760px) {
          .mantra-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .tandem-pillars { grid-template-columns: 1fr !important; gap: 18px !important; }
        }
      `}</style>
    </>
  );
}
