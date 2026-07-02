import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Flock from "@/components/Flock";

/**
 * Reaction — ink on paper.
 *
 * The page is a short manifesto: three laws of motion for business AI,
 * after Newton. Above them, three squadrons of ink darts fly true boid
 * physics — each launched from the coloured tittle of its own lowercase i
 * in the headline — and part around the cursor as it moves. Your action,
 * their Reaction. Nothing announced; the laws make the argument.
 */

/** A lowercase i whose tittle is a coloured launch pad. The glyph is dotless
 *  ı (U+0131); the dot is our own element, measured live by the Flock for
 *  lift-off, and it stays behind as the letter's permanent tittle. */
function LaunchDot({ pad }: { pad: "verm" | "blue" | "green" }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      ı
      <span data-captain={pad} className={`i-dot i-dot-${pad}`} aria-hidden="true" />
    </span>
  );
}

const serif = {
  fontFamily: "'Newsreader', Georgia, serif",
  fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
  letterSpacing: "-0.02em",
} as const;

const LAWS = [
  {
    numeral: "I",
    name: "Inertia",
    law: "Work at rest stays at rest.",
    body: [
      "Every business carries mass. The intake queue. The reconciliations. The documents that wait, sometimes for weeks, on a single pair of eyes. Left alone, that mass does not move — it accumulates.",
      "Most AI tools don't move it either. They sit outside your business, answer questions when asked, and leave the weight exactly where it was. A chat window is not a force.",
    ],
    note: "the diagnosis",
  },
  {
    numeral: "II",
    name: "Force",
    law: "Change requires a force, applied where the mass is.",
    body: [
      "Reaction builds locally hosted multi-agentic systems — LMAS. Not one general model guessing at everything, but a formation of small, specialised agents that live inside your infrastructure and apply themselves directly to your heaviest work. One triages. One drafts. One checks the draft against your rules. One asks a person before anything leaves the building.",
      "Force is proportional to how well the system knows the mass it's moving. So we begin every engagement by mapping how your business actually works — the tasks, the tools, the handoffs — and build the formation around it.",
    ],
    note: "the machinery",
  },
  {
    numeral: "III",
    name: "Reaction",
    law: "Every action meets an equal and opposite Reaction.",
    body: [
      "Your business acts; the system answers in kind — and never out of turn. It augments the tools and workflows your team already trusts rather than replacing the team itself, and we train your employees to work alongside it until it feels less like software and more like instinct.",
      "Because we host and curate everything ourselves, your data never migrates to somebody else's cloud. No third-party model quietly learning from your work. No prompts leaving the premises. What we set in motion inside your business stays inside your business — and moves only when you do.",
    ],
    note: "the guarantee",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteNav />

      {/* ── HERO: the squadrons own the page. Ink on paper. ── */}
      <section
        style={{
          position: "relative",
          minHeight: "88vh",
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
          background: "var(--bg)",
        }}
        id="top"
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <Flock />
        </div>

        <div className="container" style={{ position: "relative", zIndex: 2, padding: "180px 0 96px" }}>
          <div style={{ maxWidth: 780 }}>
            <h1
              className="ink-enter"
              aria-label="Intelligence, in formation."
              style={{
                ...serif,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "clamp(2.8rem, 7vw, 5.8rem)",
                lineHeight: 0.98,
                color: "var(--text)",
                margin: "0 0 30px",
                animationDelay: "80ms",
              }}
            >
              Intell<LaunchDot pad="verm" />gence,{" "}
              <LaunchDot pad="blue" />n format<LaunchDot pad="green" />on<span style={{ color: "var(--reaction)" }}>.</span>
            </h1>

            <p
              className="ink-enter"
              style={{
                fontSize: "clamp(1.05rem, 1.5vw, 1.2rem)",
                lineHeight: 1.65,
                color: "var(--text-soft)",
                maxWidth: "56ch",
                margin: "0 0 40px",
                animationDelay: "180ms",
              }}
            >
              Reaction builds locally hosted multi-agentic systems: a formation of small,
              specialised agents that move as one — inside your walls, around your
              workflows, in service of your team.
            </p>

            <div className="ink-enter" style={{ display: "flex", gap: 14, flexWrap: "wrap", animationDelay: "280ms" }}>
              <Link href="/demo" className="btn btn-primary btn-large">
                Set things in motion
                <span className="arrow" aria-hidden="true">→</span>
              </Link>
              <Link href="#laws" className="btn btn-ghost btn-large">
                Read the three laws
              </Link>
            </div>
          </div>

          <div
            className="mono"
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 0,
              bottom: 8,
              fontSize: "0.62rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            fig. 1 — three formations, on manoeuvres
          </div>
        </div>
      </section>

      {/* ── THE THREE LAWS ── */}
      <section style={{ padding: "110px 0 40px", borderTop: "1px solid var(--rule)" }} id="laws">
        <div className="container">
          <header style={{ maxWidth: 720, marginBottom: 30 }}>
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>
              A working theory of business AI · after Newton, 1687
            </div>
            <h2
              style={{
                ...serif,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "clamp(1.9rem, 3.6vw, 2.8rem)",
                lineHeight: 1.12,
                color: "var(--text)",
                margin: 0,
              }}
            >
              The three laws of motion, applied to the work your business
              actually does.
            </h2>
          </header>
        </div>
      </section>

      {LAWS.map((law, i) => (
        <section key={law.numeral} style={{ padding: "70px 0", borderTop: i === 0 ? "none" : "1px solid var(--rule)" }} id={`law-${i + 1}`}>
          <div className="container">
            <div className="law-grid" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 56, alignItems: "start" }}>
              <div>
                <div
                  aria-hidden="true"
                  style={{
                    ...serif,
                    fontStyle: "italic",
                    fontWeight: 500,
                    fontSize: "clamp(4rem, 8vw, 7rem)",
                    lineHeight: 0.9,
                    color: i === 2 ? "var(--reaction)" : "var(--text)",
                    opacity: i === 2 ? 1 : 0.92,
                  }}
                >
                  {law.numeral}
                </div>
                <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 18 }}>
                  {law.name} · {law.note}
                </div>
              </div>

              <div style={{ maxWidth: "62ch" }}>
                <h3
                  style={{
                    ...serif,
                    fontStyle: "italic",
                    fontWeight: 600,
                    fontSize: "clamp(1.5rem, 2.6vw, 2.1rem)",
                    lineHeight: 1.15,
                    color: "var(--text)",
                    margin: "0.35em 0 26px",
                  }}
                >
                  {law.law}
                </h3>
                {law.body.map((p) => (
                  <p key={p.slice(0, 24)} style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "var(--text-soft)", margin: "0 0 20px" }}>
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── CODA ── */}
      <section style={{ padding: "120px 0 130px", borderTop: "1px solid var(--rule)", textAlign: "center" }} id="demo">
        <div className="container">
          <div
            className="mono"
            style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 26 }}
          >
            Philosophiæ Naturalis · adapted
          </div>
          <blockquote
            style={{
              ...serif,
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "clamp(1.9rem, 4vw, 3.2rem)",
              lineHeight: 1.15,
              color: "var(--text)",
              maxWidth: "22ch",
              margin: "0 auto 20px",
            }}
          >
            Every action has an equal and opposite <span style={{ color: "var(--reaction)" }}>Reaction</span>.
          </blockquote>
          <p style={{ fontSize: "1.02rem", lineHeight: 1.6, color: "var(--text-soft)", maxWidth: "44ch", margin: "0 auto 44px" }}>
            A demonstration takes half an hour. The Reaction is immediate.
          </p>
          <Link href="/demo" className="btn btn-primary btn-large">
            Set things in motion
            <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
