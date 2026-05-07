import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SignInForm from "./SignInForm";

export const metadata = { title: "Sign in · Reaction" };

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  return (
    <>
      <SiteNav rightAction={{ label: "Home", href: "/" }} />
      <section style={{ padding: "80px 0 60px", minHeight: "60vh" }}>
        <div className="container-narrow" style={{ maxWidth: 480 }}>
          <div className="page-eyebrow">Sign in</div>
          <h1 className="page-title">
            Welcome <em>back</em>.
          </h1>
          <p className="page-lede">
            Enter your email and we'll send you a magic link. Or use your password if you've set one.
          </p>

          <div className="panel">
            <SignInForm callbackUrl={searchParams.callbackUrl} initialError={searchParams.error} />
          </div>

          <p style={{ textAlign: "center", marginTop: 32, fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Don't have a login yet?{" "}
            <a href="/demo" style={{ color: "var(--reaction)", textDecoration: "none", fontWeight: 500 }}>
              Register your interest →
            </a>
          </p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
