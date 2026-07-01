import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import AgentConstellation from "@/components/AgentConstellation";
import AugmentedCore from "@/components/AugmentedCore";
import RevealFx from "@/components/RevealFx";
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
      <RevealFx />
      <SiteNav />

      {/* HERO — full-bleed: the living constellation IS the background.
          Text sits on a scrim layer above it; entrance is staggered fade-up. */}
      <section
        className="hero-full"
        style={{ position: "relative", padding: "150px 0 130px", background: "var(--reaction-deep)", overflow: "hidden" }}
        id="top"
      >
        {/* Layer −1: deep vignette — dark edges give the field its depth,
            and stop the background wash that was flattening the text blues */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(95% 130% at 68% 40%, #3a2a1c 0%, #14100c 46%, #0a0908 100%)",
          }}
        />

        {/* Layer 0: the constellation, edge to edge */}
        <div data-hero-visual aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <AgentConstellation />
        </div>

        {/* Layer 1: legibility scrim — dense over the copy, open on the right */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(8,7,6,0.88) 0%, rgba(8,7,6,0.66) 38%, rgba(8,7,6,0.22) 62%, rgba(8,7,6,0.04) 100%), linear-gradient(180deg, rgba(8,7,6,0.35) 0%, rgba(8,7,6,0) 20%, rgba(8,7,6,0) 64%, rgba(8,7,6,0.92) 100%)",
          }}
        />

        {/* Layer 2: the copy */}
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div style={{ maxWidth: 760 }}>
          <div className="page-eyebrow rx-enter" style={{ marginBottom: 32, fontWeight: 600, color: "#cbb9a2", animationDelay: "60ms" }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--action)",
                animation: "pulse 2.4s infinite",
                marginLeft: -10,
              }}
            />{" "}
            Locally hosted multi-agentic systems · augmented intelligence for business
          </div>

          <h1
            className="rx-enter"
            style={{
              ...display,
              fontSize: "clamp(2.4rem, 6.5vw, 5.4rem)",
              lineHeight: 0.98,
              maxWidth: "18ch",
              margin: "0 0 32px",
              color: "#f7f4ef",
              animationDelay: "140ms",
              textShadow: "0 2px 24px rgba(0,0,0,0.5)",
            }}
          >
            Every <em style={{ color: "var(--action)" }}>action</em> has an equal and opposite{" "}
            <em style={{ color: "#ff9a66", textShadow: "0 0 36px rgba(255,140,80,0.45)" }}>Reaction</em>.
          </h1>

          <div
            className="mono rx-enter"
            style={{ fontSize: "0.78rem", letterSpacing: "0.06em", color: "rgba(247,244,239,0.55)", marginBottom: 44, animationDelay: "220ms" }}
          >
            — Sir Isaac Newton, 1687
          </div>

          <p
            className="rx-enter"
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontWeight: 500,
              fontVariationSettings: '"opsz" 48, "SOFT" 0, "WONK" 0',
              fontSize: "clamp(1.3rem, 2.4vw, 1.85rem)",
              lineHeight: 1.32,
              letterSpacing: "-0.015em",
              maxWidth: "32ch",
              margin: "0 0 22px",
              color: "#efe9df",
              animationDelay: "300ms",
            }}
          >
            Locally hosted multi-agentic systems that augment how your
            business works.
          </p>

          <p
            className="rx-enter"
            style={{
              fontSize: "clamp(1.05rem, 1.45vw, 1.15rem)",
              lineHeight: 1.6,
              maxWidth: "56ch",
              color: "rgba(240,235,226,0.85)",
              margin: "0 0 44px",
              animationDelay: "380ms",
            }}
          >
            We help your business have the right <span style={{ color: "#ff9a66" }}>reaction</span> to AI, empowering employers and employees with the tools they need to succeed.
          </p>

          <div className="rx-enter" style={{ display: "flex", gap: 14, flexWrap: "wrap", animationDelay: "460ms" }}>
            <Link href="/demo" className="btn btn-hero-primary btn-large">
              Book a demo
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="#what" className="btn btn-hero-ghost btn-large">
              What we do
            </Link>
          </div>
          </div>

          <div
            className="mono"
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 24,
              bottom: -76,
              fontSize: "0.62rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(212,178,138,0.75)",
            }}
          >
            LMAS · live inside your walls
          </div>
        </div>
      </section>

      {/* THE PROBLEM — light marble: a deliberate hard cut out of the deep hero */}
      <section
        style={{
          padding: "100px 0",
          background: "var(--bg)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div className="container">

          <header style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "block", width: 32, height: 1, background: "var(--action)", margin: "0 auto 18px" }} />
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 24 }}>
              The problem
            </div>
            <h3
              style={{
                ...display,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.15,
                color: "var(--text)",
                margin: "0 auto",
                maxWidth: "22ch",
              }}
            >
              Built as a <span className="reaction-mark" style={{ color: "var(--reaction)" }}>Reaction</span> to how AI is usually sold to business.
            </h3>
          </header>

          <div>
            <div>
              {[
                {
                  num: "01",
                  h: "Your data, someone else's cloud",
                  p: "Most AI tools send your prompts and your data to third-party clouds you don't control — and quietly retain it.",
                },
                {
                  num: "02",
                  h: "Generic models you can't steer",
                  p: "Off-the-shelf assistants don't know your business, shift without warning, and can't be tuned to how your teams actually work.",
                },
                {
                  num: "03",
                  h: "AI that replaces, not augments",
                  p: "Most tools are sold as a way to replace your team — instead of making the tools and workflows they already rely on measurably better.",
                },
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
                  <div className="mono" style={{ color: "var(--action-deep)", fontSize: "0.7rem", letterSpacing: "0.1em", paddingTop: 10 }}>
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
                        color: "var(--text)",
                      }}
                    >
                      {row.h}
                    </h4>
                    <p style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "var(--text-soft)", margin: 0 }}>
                      {row.p}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* WHAT IT DOES */}
      <section style={{ padding: "100px 0", background: "var(--bg-elevated)" }} id="what">
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
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-soft)", paddingTop: 12, position: "relative" }}>
              <span style={{ position: "absolute", top: 0, left: 0, width: 32, height: 1, background: "var(--reaction)" }} />
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
                color: "var(--text)",
              }}
            >
              One system that takes work <em style={{ color: "var(--reaction)", fontStyle: "italic" }}>off</em> your team's plate.
            </h2>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
              borderRadius: 16,
              overflow: "hidden",
            }}
            className="pillars-grid"
          >
            {[
              { num: "01 · AUTOMATE", h: "Take on the busywork", p: "Agents handle the repetitive, multi-step tasks that clog your workflows — triage, data entry, drafting, lookups, reconciliation — end to end, not just a single prompt." },
              { num: "02 · CONNECT", h: "Work across your stack", p: "The system reaches into the tools and data your business already runs on, so work moves between systems without a person copying it across by hand." },
              { num: "03 · DECIDE", h: "Surface the right call", p: "It brings the relevant context to your team at the moment of decision — a recommendation and the reasoning behind it — so they act faster, and stay in charge." },
            ].map((p) => (
              <div key={p.num} className="card-float" style={{ padding: "36px 32px 40px" }}>
                <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--reaction)", marginBottom: 28 }}>
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

      {/* USE CASES (repurposed from For Universities) */}
      <section style={{ padding: "100px 0", borderTop: "1px solid var(--rule)" }} id="use-cases">
        <div className="container">
          <header style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "block", width: 32, height: 1, background: "var(--reaction)", margin: "0 auto 18px" }} />
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 24 }}>
              Use cases
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
              Built for the work your teams actually <em style={{ color: "var(--reaction)" }}>do</em>.
            </h2>
          </header>

          <div>
            <div className="an-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { num: "01", h: "Operations & admin", p: "Automate intake, scheduling, document handling and the repetitive flows that slow teams down — with a person approving anything that matters before it goes out." },
                { num: "02", h: "Finance & compliance", p: "Agents that reconcile, check work against your rules, and flag exceptions — every step logged for a full audit trail, all on infrastructure you control." },
                { num: "03", h: "Customer & client operations", p: "Triage incoming requests, draft responses, and pull the right account context together, so your team resolves more without losing the human touch." },
                { num: "04", h: "Knowledge & research", p: "Turn your internal documents and data into a system your team can actually query — answers grounded in your own material, kept entirely in-house." },
              ].map((row) => (
                <div
                  key={row.num}
                  className="card-float"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    gap: 24,
                    padding: "30px 28px",
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

      {/* OUR APPROACH — how it's built: local, augmented, secure. Replaces the old Tandem credit. */}
      <section style={{ padding: "100px 0", background: "var(--reaction-deep)" }} id="approach">
        <div className="container">

          <header style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 60px" }}>
            <div style={{ display: "block", width: 32, height: 1, background: "var(--action)", margin: "0 auto 18px" }} />
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--reaction-soft)", marginBottom: 22 }}>
              How we build it
            </div>
            <h2
              style={{
                ...display,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.13,
                color: "#f7f4ef",
                margin: "0 auto",
                maxWidth: "20ch",
              }}
            >
              Intelligence that stays <em style={{ color: "var(--action)", fontStyle: "italic" }}>inside</em> your walls.
            </h2>
            <p
              style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontWeight: 500,
                fontVariationSettings: '"opsz" 36, "SOFT" 0, "WONK" 0',
                fontSize: "1.15rem",
                lineHeight: 1.55,
                color: "#c4b8a4",
                maxWidth: "56ch",
                margin: "28px auto 0",
              }}
            >
              The thinking behind Reaction runs on systems we host and control — not piped out to third-party AI clouds. Curated by us, updated by us, kept where your business&rsquo;s data belongs.
            </p>
          </header>

          {/* Three pillars — not a sequence, so labelled kickers rather than 01/02/03 */}
          <div
            className="approach-pillars"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
              marginBottom: 28,
              alignItems: "stretch",
            }}
          >
            {/* LMAS — the signature: a bounded perimeter ("your walls") holding a cluster of agents */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(247,244,239,0.04)",
                backdropFilter: "blur(8px)",
                boxShadow: "inset 0 1px 0 rgba(247,244,239,0.08)",
                border: "1px solid rgba(247,244,239,0.14)",
                borderRadius: 14,
                padding: "28px 26px",
              }}
            >
              <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--reaction-soft)", marginBottom: 22 }}>
                LMAS
              </div>
              <svg width="100%" height="88" viewBox="0 0 168 88" fill="none" aria-hidden="true" focusable="false" style={{ display: "block", marginBottom: 20 }}>
                <rect x="1.5" y="1.5" width="165" height="85" rx="12" stroke="var(--reaction-soft)" strokeOpacity="0.4" strokeDasharray="5 5" />
                <path d="M48 32 L92 26 M92 26 L122 54 M48 32 L70 64 M70 64 L122 54" stroke="var(--reaction-soft)" strokeOpacity="0.32" />
                <circle cx="48" cy="32" r="8" fill="var(--action)" />
                <circle cx="92" cy="26" r="6.5" stroke="#d8ccb6" strokeWidth="1.6" />
                <circle cx="122" cy="54" r="8" fill="var(--action)" />
                <circle cx="70" cy="64" r="6.5" stroke="#d8ccb6" strokeWidth="1.6" />
              </svg>
              <h3
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 600,
                  fontSize: "1.4rem",
                  letterSpacing: "-0.015em",
                  lineHeight: 1.18,
                  margin: "0 0 12px",
                  color: "#f7f4ef",
                }}
              >
                Locally hosted multi-agentic systems
              </h3>
              <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "#c4b8a4", margin: 0 }}>
                Specialised agents working together on infrastructure you control — inside your organisation&rsquo;s boundary, not handed to an outside vendor. The intelligence lives where your data already does.
              </p>
            </div>

            {/* Augmented, not artificial — the flagship 3D: inputs converge into the core */}
            <div
              data-core-card
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(247,244,239,0.04)",
                backdropFilter: "blur(8px)",
                boxShadow: "inset 0 1px 0 rgba(247,244,239,0.08)",
                border: "1px solid rgba(247,244,239,0.14)",
                borderRadius: 14,
                padding: "28px 26px",
              }}
            >
              <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--reaction-soft)", marginBottom: 22 }}>
                Augmented · not artificial
              </div>
              {/* The flagship: augmented core in real depth (hover to interact) */}
              <div style={{ position: "relative", height: 224, margin: "-6px 0 20px" }}>
                <AugmentedCore />
              </div>
              <h3
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 600,
                  fontSize: "1.4rem",
                  letterSpacing: "-0.015em",
                  lineHeight: 1.18,
                  margin: "0 0 12px",
                  color: "#f7f4ef",
                }}
              >
                Augmented over artificial
              </h3>
              <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "#c4b8a4", margin: 0 }}>
                We build AI that augments the tools and workflows your team works with — never replacing the team itself — and we train your employees to use it with confidence. They stay in the loop, and in charge.
              </p>
            </div>

            {/* Curated, secure — a closed boundary keeping the data node inside */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(247,244,239,0.04)",
                backdropFilter: "blur(8px)",
                boxShadow: "inset 0 1px 0 rgba(247,244,239,0.08)",
                border: "1px solid rgba(247,244,239,0.14)",
                borderRadius: 14,
                padding: "28px 26px",
              }}
            >
              <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--reaction-soft)", marginBottom: 22 }}>
                Curated · secure
              </div>
              <svg width="100%" height="88" viewBox="0 0 168 88" fill="none" aria-hidden="true" focusable="false" style={{ display: "block", marginBottom: 20 }}>
                <rect x="54" y="30" width="60" height="46" rx="10" stroke="var(--reaction-soft)" strokeOpacity="0.55" strokeWidth="1.6" />
                <path d="M72 30 v-6 a12 12 0 0 1 24 0 v6" stroke="var(--reaction-soft)" strokeOpacity="0.55" strokeWidth="1.6" />
                <circle cx="84" cy="53" r="9" fill="var(--action)" />
              </svg>
              <h3
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 600,
                  fontSize: "1.4rem",
                  letterSpacing: "-0.015em",
                  lineHeight: 1.18,
                  margin: "0 0 12px",
                  color: "#f7f4ef",
                }}
              >
                Data that never leaves
              </h3>
              <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "#c4b8a4", margin: 0 }}>
                Because the system is hosted and maintained by us, your data stays in a controlled environment — aligned with UK data-residency and GDPR expectations, with no third-party model quietly training on it.
              </p>
            </div>
          </div>

          {/* Equal and opposite — the security argument as two opposed panels */}
          <div
            className="approach-contrast"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div style={{ background: "rgba(247,244,239,0.03)", border: "1px solid rgba(247,244,239,0.10)", borderRadius: 14, padding: "26px 26px" }}>
              <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#99907e", marginBottom: 16 }}>
                The usual way
              </div>
              {[
                "Prompts and business data sent to third-party AI clouds",
                "Models shift underneath you, without warning",
                "Governance and uptime you don't control",
              ].map((line) => (
                <div key={line} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "8px 0", color: "#93897a", fontSize: "0.92rem", lineHeight: 1.5 }}>
                  <span aria-hidden="true" style={{ color: "#6b5f4c", flexShrink: 0 }}>—</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(232,98,47,0.07)", border: "1px solid rgba(232,98,47,0.4)", borderRadius: 14, padding: "26px 26px" }}>
              <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--action)", marginBottom: 16 }}>
                The Reaction way
              </div>
              {[
                "Runs on infrastructure we host and curate",
                "Models and knowledge maintained, and versioned, by us",
                "Your data stays inside your environment",
              ].map((line) => (
                <div key={line} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "8px 0", color: "#efe8db", fontSize: "0.92rem", lineHeight: 1.5 }}>
                  <span aria-hidden="true" style={{ color: "var(--action)", flexShrink: 0 }}>+</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* HOW WE WORK (repurposed from For Employers) */}
      <section style={{ padding: "100px 0", borderTop: "1px solid var(--rule)" }} id="how-we-work">
        <div className="container">
          <header style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "block", width: 32, height: 1, background: "var(--reaction)", margin: "0 auto 18px" }} />
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 24 }}>
              How we work
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
              Built around your business, owned by <em style={{ color: "var(--reaction)" }}>you</em>.
            </h2>
          </header>

          <div>
            <div className="an-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { num: "01", h: "We build it around your workflows", p: "Discovery first. We map how your business actually works — the tasks, the tools, the handoffs — before a line of code, so the system fits your operation rather than the other way round." },
                { num: "02", h: "Hosted and maintained by us", p: "We stand it up on infrastructure you control, then keep the models and knowledge current — so you get a system that stays sharp without an in-house AI team to run it." },
                { num: "03", h: "Your team, trained", p: "We train your employees to work alongside the system with confidence — because augmented intelligence only pays off when the team members using it trust it and know how." },
                { num: "04", h: "Yours, not rented", p: "No per-seat subscriptions feeding a third party, no data leaving your walls. The system lives inside your business and answers to you." },
              ].map((row) => (
                <div
                  key={row.num}
                  className="card-float"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    gap: 24,
                    padding: "30px 28px",
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
            <em style={{ color: "var(--reaction)" }}>business</em>.
          </h2>
          <p style={{ maxWidth: "52ch", margin: "0 auto 44px", color: "var(--text-soft)", fontSize: "1.05rem" }}>
            We build locally hosted multi-agentic systems for businesses that want AI on their own terms —
            augmenting the tools and workflows their teams use, inside their own walls. If you'd like to see what that looks like for your workflows, get in touch.
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
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--action) 60%, transparent); }
          50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--action) 0%, transparent); }
        }
        @media (max-width: 760px) {
          .mantra-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .approach-pillars { grid-template-columns: 1fr !important; gap: 18px !important; }
          .approach-contrast { grid-template-columns: 1fr !important; gap: 14px !important; }
        }
      `}</style>
    </>
  );
}
