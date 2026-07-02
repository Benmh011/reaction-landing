import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Flock from "@/components/Flock";
import { auth } from "@/auth";
import BuildReveal from "@/components/BuildReveal";
import AutomationDial from "@/components/AutomationDial";

/**
 * Reaction — ink on paper.
 *
 * The page is a short manifesto: the Augmentation Ethos — enhance people,
 * after Newton. Above them, three squadrons of ink darts fly true boid
 * physics — each launched from the coloured tittle of its own lowercase i
 * in the headline — and part around the cursor as it moves. Your action,
 * their Reaction. Nothing announced; the position makes the argument.
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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);
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
              {loggedIn ? (
                <Link href="/demo" className="btn btn-primary btn-large">
                  Launch demo
                  <span className="arrow" aria-hidden="true">→</span>
                </Link>
              ) : (
                <Link href="/auth/register" className="btn btn-primary btn-large">
                  Create account
                  <span className="arrow" aria-hidden="true">→</span>
                </Link>
              )}
              <Link href="#ethos" className="btn btn-ghost btn-large">
                Read the ethos
              </Link>
            </div>

            {loggedIn ? (
              <div className="mono ink-enter" style={{ marginTop: 18, fontSize: "0.74rem", letterSpacing: "0.08em", color: "var(--text-muted)", animationDelay: "440ms" }}>
                Signed in as {session?.user?.email}.{" "}
                <Link href="/auth/signout" style={{ color: "var(--reaction)", textDecoration: "none", borderBottom: "1px solid currentColor" }}>
                  Sign out
                </Link>
              </div>
            ) : (
              <div className="mono ink-enter" style={{ marginTop: 18, fontSize: "0.74rem", letterSpacing: "0.08em", color: "var(--text-muted)", animationDelay: "440ms" }}>
                Already have an account?{" "}
                <Link href="/auth/signin" style={{ color: "var(--reaction)", textDecoration: "none", borderBottom: "1px solid currentColor" }}>
                  Sign in
                </Link>
              </div>
            )}
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

      {/* ── THE AUGMENTATION ETHOS ── */}
      <BuildReveal target="ethos" />
      <section style={{ padding: "110px 0 90px", borderTop: "1px solid var(--rule)" }} id="ethos">
        <div className="container">
          <header className="ethos-item ethos-head-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 72, alignItems: "center", marginBottom: 70 }}>
            <div style={{ maxWidth: 620 }}>
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>
              Our position · how we work with your people
            </div>
            <h2
              style={{
                ...serif,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "clamp(2.1rem, 4.2vw, 3.2rem)",
                lineHeight: 1.1,
                color: "var(--text)",
                margin: "0 0 22px",
              }}
            >
              <span className="ethos-cap-verm">T</span>he <span className="ethos-cap-blue">A</span>ugmentation{" "}
              <span className="ethos-cap-green">E</span>thos<span style={{ color: "var(--reaction)" }}>.</span>
            </h2>
            <p style={{ fontSize: "1.08rem", lineHeight: 1.7, color: "var(--text-soft)", margin: 0, maxWidth: "58ch" }}>
              We build systems that make your people more capable — never cheaper to remove.
              That isn&rsquo;t a slogan; it&rsquo;s a design constraint we accept in every engagement.
            </p>
            </div>
            <AutomationDial />
          </header>

          {[
            {
              num: "01",
              name: "Augment, don't replace",
              head: "Enhancement over headcount.",
              body: [
                "Our agents take the repetitive weight out of a role so the person in it can do more of what they're actually for: judgement, care, relationships, craft. The measure of a deployment isn't who it makes redundant — it's how much more the same team can carry.",
                "If a proposal only makes sense as a redundancy plan, we decline the work. An augmented team compounds; a hollowed-out one just gets quieter.",
              ],
            },
            {
              num: "02",
              name: "The dial, not the switch",
              head: "You control the degree of automation.",
              body: [
                "Automation isn't all-or-nothing. Every workflow we build carries a dial: fully manual, agent-assisted, agent-drafted with human sign-off, or fully automated — set per task, by your team, and reversible at any time.",
                "Trust in a system is earned in increments. So the system is built to be dialled — never surrendered to.",
              ],
            },
            {
              num: "03",
              name: "Headroom",
              head: "New skills inside the role they already hold.",
              body: [
                "The hours an agent returns don't vanish; they become headroom. The people who ran a process learn to direct it — briefing agents, auditing their output, catching what the system can't see.",
                "That's a promotion in capability without a change of job title — and it's how a business grows its own operators instead of renting ours forever.",
              ],
            },
          ].map((tenet, i) => (
            <div
              key={tenet.num}
              className="ethos-grid ethos-item"
              style={{
                display: "grid",
                gridTemplateColumns: "220px 1fr",
                gap: 56,
                alignItems: "start",
                padding: "44px 0",
                borderTop: "1px solid var(--rule)",
              }}
            >
              <div>
                <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: ["#c93a17", "#2565aa", "#0d5a40"][i], marginBottom: 10 }}>
                  {tenet.num}
                </div>
                <div style={{ ...serif, fontStyle: "italic", fontWeight: 600, fontSize: "1.15rem", lineHeight: 1.3, color: "var(--text)" }}>
                  {tenet.name}
                </div>
              </div>
              <div>
                <h3
                  style={{
                    ...serif,
                    fontStyle: "italic",
                    fontWeight: 600,
                    fontSize: "clamp(1.25rem, 2vw, 1.55rem)",
                    lineHeight: 1.2,
                    color: "var(--text)",
                    margin: "0 0 16px",
                  }}
                >
                  {tenet.head}
                </h3>
                {tenet.body.map((p) => (
                  <p key={p.slice(0, 24)} style={{ fontSize: "0.98rem", lineHeight: 1.7, color: "var(--text-soft)", margin: "0 0 14px" }}>
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT WE BUILD ── */}
      <BuildReveal />
      <section style={{ padding: "100px 0 90px", borderTop: "1px solid var(--rule)" }} id="build">
        <div className="container">
          <header style={{ maxWidth: 720, marginBottom: 64 }}>
            <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>
              What we build · three trades, one workshop
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
              Websites, software, and the systems that move them.
            </h2>
          </header>

          <div className="build-thread" aria-hidden="true" />
          <div className="build-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 56, alignItems: "start" }}>
            {[
              {
                num: "01",
                name: "Websites",
                h: "Shopfronts that carry their weight.",
                p: "Fast, hand-built sites for working businesses — the shopfront, the booking flow, the pages a customer actually reads. Designed and written with intent, hosted and maintained by us, and measured on one thing: whether the work comes in.",
                flagship: false,
              },
              {
                num: "02",
                name: "Software",
                h: "Software fitted to the business.",
                p: "Client portals, internal tools, practice dashboards — the systems behind the counter. Built on modern foundations around the way your team already works, so the software bends to the business, never the other way round.",
                flagship: false,
              },
              {
                num: "03",
                name: "LMAS",
                h: "Locally hosted multi-agentic systems.",
                p: "The flagship. Formations of small, specialised agents on infrastructure you control, applying themselves to your heaviest work — with your people holding the dial. Websites bring the work in; software organises it; a LMAS moves it.",
                flagship: true,
              },
            ].map((b) => (
              <div key={b.num} className="build-item">
                <div
                  className="mono"
                  style={{
                    fontSize: "0.68rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: b.flagship ? "var(--reaction)" : "var(--text-muted)",
                    marginBottom: 16,
                  }}
                >
                  {b.num} · {b.name}
                </div>
                <h3
                  style={{
                    ...serif,
                    fontStyle: "italic",
                    fontWeight: 600,
                    fontSize: "clamp(1.3rem, 2vw, 1.6rem)",
                    lineHeight: 1.18,
                    color: "var(--text)",
                    margin: "0 0 18px",
                  }}
                >
                  {b.h}
                </h3>
                <p style={{ fontSize: "0.98rem", lineHeight: 1.7, color: "var(--text-soft)", margin: 0 }}>
                  {b.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
