import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata = { title: "Your preview · Reaction" };

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { name, email, organisation, demoVersion, role } = session.user;
  const displayName = name || email?.split("@")[0] || "there";

  // For employer demos, pass the organisation name through the URL hash so
  // the React app can display it. (Hash isn't sent to the server, just used client-side.)
  const isEmployerDemo = demoVersion === "employer";
  const launchUrl = demoVersion
    ? `/demo-app/${demoVersion}/${
        isEmployerDemo && organisation ? `#name=${encodeURIComponent(organisation)}` : ""
      }`
    : "#";

  return (
    <>
      <SiteNav signOutHref="/auth/signout" />

      <section style={{ padding: "60px 0 40px" }}>
        <div className="container">
          <div className="page-eyebrow">Your preview</div>
          <h1 className="page-title">
            Welcome, <em>{displayName}</em>.
          </h1>
          {organisation && (
            <p style={{ fontSize: "1.1rem", color: "var(--text-soft)", margin: "0 0 8px" }}>
              <span className="reaction-mark">Reaction</span> for {organisation}
            </p>
          )}
          {role === "ADMIN" && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 24px" }}>
              Signed in as admin ·{" "}
              <a href="/admin" style={{ color: "var(--reaction)", textDecoration: "none" }}>
                Admin panel →
              </a>
            </p>
          )}
        </div>
      </section>

      <section style={{ padding: "0 0 80px" }}>
        <div className="container">
          {demoVersion ? (
            <div className="panel" style={{ textAlign: "center", padding: 48 }}>
              <div
                className="mono"
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--reaction)",
                  marginBottom: 16,
                }}
              >
                Build · {demoVersion}
              </div>
              <h2
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontWeight: 600,
                  fontVariationSettings: '"opsz" 144',
                  fontStyle: "italic",
                  fontSize: "2rem",
                  margin: "0 0 16px",
                  letterSpacing: "-0.02em",
                }}
              >
                {isEmployerDemo ? "Your employer dashboard is ready." : "Your bespoke build is ready."}
              </h2>
              <p style={{ fontSize: "1rem", color: "var(--text-soft)", maxWidth: "52ch", margin: "0 auto 32px", lineHeight: 1.6 }}>
                {isEmployerDemo
                  ? `See what posting opportunities looks like for ${organisation || "your business"}, and how students discover what you put up.`
                  : `Your tailored Reaction preview is loaded and ready to explore. This build is configured for ${organisation || "your organisation"}.`}
              </p>
              <a href={launchUrl} className="btn btn-primary btn-large">
                {isEmployerDemo ? "Open dashboard" : "Launch demo"}
                <span className="arrow" aria-hidden="true">→</span>
              </a>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "24px 0 0" }}>
                Private to {organisation || "your organisation"} · only you and Reaction admins can access this preview.
              </p>
            </div>
          ) : (
            <div className="panel" style={{ textAlign: "center", padding: 48 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--warning) 14%, transparent)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  fontSize: 24,
                }}
              >
                ⏳
              </div>
              <h2
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontWeight: 600,
                  fontVariationSettings: '"opsz" 144',
                  fontStyle: "italic",
                  fontSize: "1.8rem",
                  margin: "0 0 16px",
                  letterSpacing: "-0.02em",
                }}
              >
                Your preview is being prepared.
              </h2>
              <p style={{ fontSize: "1rem", color: "var(--text-soft)", maxWidth: "52ch", margin: "0 auto 16px", lineHeight: 1.6 }}>
                We're configuring a bespoke build of Reaction for{" "}
                {organisation ? <strong>{organisation}</strong> : "your organisation"}. Your account manager will be in
                touch to schedule a guided walkthrough.
              </p>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
                Questions in the meantime?{" "}
                <a href="mailto:info@reaction.org.uk" style={{ color: "var(--reaction)", textDecoration: "none" }}>
                  info@reaction.org.uk
                </a>
              </p>
            </div>
          )}

          {/* Quick context tiles - only show for university clients, not employers */}
          {!isEmployerDemo && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1,
                background: "var(--rule)",
                border: "1px solid var(--rule)",
                borderRadius: 16,
                overflow: "hidden",
                marginTop: 32,
              }}
              className="pillars-grid"
            >
              {[
                { num: "01 · ON CAMPUS", h: "Sport · Study · Games", p: "Peer-to-peer activity matching across faculties and accommodation." },
                { num: "02 · OFF CAMPUS", h: "Community", p: "Charities, fundraising, social events, and campaigns." },
                { num: "03 · WHAT'S NEXT", h: "Opportunities", p: "Part-time roles, internships, graduate schemes." },
              ].map((p) => (
                <div key={p.num} style={{ background: "var(--bg-elevated)", padding: 28 }}>
                  <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--reaction)", marginBottom: 14 }}>
                    {p.num}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontWeight: 600,
                      fontVariationSettings: '"opsz" 96',
                      fontSize: "1.15rem",
                      letterSpacing: "-0.012em",
                      margin: "0 0 10px",
                    }}
                  >
                    {p.h}
                  </h3>
                  <p style={{ fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text-soft)", margin: 0 }}>{p.p}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />

      <style>{`
        @media (max-width: 760px) {
          .pillars-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
