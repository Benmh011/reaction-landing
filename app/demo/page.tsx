import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import DemoRequestForm from "./DemoRequestForm";

export const metadata = {
  title: "Book a demo · Reaction",
};

export default function DemoPage() {
  return (
    <>
      <SiteNav />

      <section style={{ padding: "80px 0 60px" }}>
        <div className="container-narrow">
          <div className="page-eyebrow">Demo</div>
          <h1 className="page-title">
            See <em>Reaction</em> in your students' hands.
          </h1>
          <p className="page-lede">
            Two ways to start. Register your interest below — we'll get back to you within two working days to schedule
            a guided walkthrough. If you've already been given a login, you can launch your preview directly.
          </p>

          {/* Two paths panel */}
          <div className="panel" style={{ marginBottom: 32 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="two-col">
              <div>
                <div
                  className="mono"
                  style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--reaction)", marginBottom: 12 }}
                >
                  01 · No account yet
                </div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontVariationSettings: '"opsz" 96', fontSize: "1.25rem", margin: "0 0 8px", letterSpacing: "-0.015em" }}>
                  Register your interest
                </h3>
                <p style={{ fontSize: "0.92rem", color: "var(--text-soft)", margin: "0 0 0", lineHeight: 1.5 }}>
                  Fill in the form below. We'll review and follow up to set up your bespoke preview.
                </p>
              </div>
              <div>
                <div
                  className="mono"
                  style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--reaction)", marginBottom: 12 }}
                >
                  02 · Already approved
                </div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontVariationSettings: '"opsz" 96', fontSize: "1.25rem", margin: "0 0 8px", letterSpacing: "-0.015em" }}>
                  Launch demo
                </h3>
                <p style={{ fontSize: "0.92rem", color: "var(--text-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Sign in with the email we used to send your magic link.
                </p>
                <Link href="/auth/signin" className="btn btn-ghost">
                  Launch demo
                  <span className="arrow" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* The form */}
          <div className="panel">
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontVariationSettings: '"opsz" 96', fontSize: "1.5rem", margin: "0 0 6px", letterSpacing: "-0.015em" }}>
              Register your interest
            </h2>
            <p style={{ fontSize: "0.92rem", color: "var(--text-soft)", margin: "0 0 24px" }}>
              Required fields marked <span style={{ color: "var(--reaction)" }}>·</span>
            </p>
            <DemoRequestForm />
          </div>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        @media (max-width: 600px) {
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
