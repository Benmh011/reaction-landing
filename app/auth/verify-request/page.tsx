import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata = { title: "Check your inbox · Reaction" };

export default function VerifyRequestPage() {
  return (
    <>
      <SiteNav rightAction={{ label: "Home", href: "/" }} />
      <section style={{ padding: "120px 0 80px", minHeight: "60vh" }}>
        <div className="container-narrow" style={{ maxWidth: 540, textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--reaction) 12%, transparent)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 28 }}>✉</span>
          </div>
          <div className="page-eyebrow" style={{ justifyContent: "center" }}>
            Check your inbox
          </div>
          <h1 className="page-title">
            A <em>magic link</em> is on its way.
          </h1>
          <p className="page-lede" style={{ margin: "0 auto 32px" }}>
            We've sent a sign-in link to your email. Click it to access your Reaction preview. The link is valid for
            24 hours and can only be used once.
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Didn't receive it? Check your spam folder, or{" "}
            <a href="/auth/signin" style={{ color: "var(--reaction)", textDecoration: "none", fontWeight: 500 }}>
              try again
            </a>
            .
          </p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
