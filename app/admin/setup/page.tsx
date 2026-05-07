import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata = { title: "Setup · Reaction" };
export const dynamic = "force-dynamic";

// One-time admin bootstrap. Visit /admin/setup once after first deploy with
// ADMIN_EMAIL_INITIAL and ADMIN_PASSWORD_INITIAL set. After the admin exists,
// this page becomes a no-op and redirects to sign-in.
export default async function SetupPage() {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

  // If an admin already exists, this page is closed
  if (adminCount > 0) {
    redirect("/auth/signin");
  }

  const email = process.env.ADMIN_EMAIL_INITIAL?.toLowerCase();
  const pw = process.env.ADMIN_PASSWORD_INITIAL;

  if (!email || !pw || pw.length < 10) {
    return (
      <>
        <SiteNav rightAction={{ label: "Home", href: "/" }} />
        <section style={{ padding: "100px 0", minHeight: "60vh" }}>
          <div className="container-narrow">
            <div className="page-eyebrow">Setup</div>
            <h1 className="page-title">Configuration <em>missing</em>.</h1>
            <p className="page-lede">
              To create the first admin account, set <span className="mono" style={{ color: "var(--reaction)" }}>ADMIN_EMAIL_INITIAL</span>{" "}
              and <span className="mono" style={{ color: "var(--reaction)" }}>ADMIN_PASSWORD_INITIAL</span> in your Vercel
              environment variables (password must be at least 10 characters), then redeploy and reload this page.
            </p>
          </div>
        </section>
        <SiteFooter />
      </>
    );
  }

  // Create the admin
  const passwordHash = await bcrypt.hash(pw, 12);
  await prisma.user.create({
    data: {
      email,
      name: "Admin",
      role: "ADMIN",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  return (
    <>
      <SiteNav rightAction={{ label: "Home", href: "/" }} />
      <section style={{ padding: "100px 0", minHeight: "60vh" }}>
        <div className="container-narrow" style={{ textAlign: "center" }}>
          <div className="page-eyebrow" style={{ justifyContent: "center" }}>Setup complete</div>
          <h1 className="page-title">
            Admin <em>created</em>.
          </h1>
          <p className="page-lede" style={{ margin: "0 auto 32px" }}>
            Sign in with the email and password you set in your environment variables. After signing in successfully,
            <strong> remove ADMIN_PASSWORD_INITIAL from your env vars</strong> and consider rotating the password from
            the admin panel.
          </p>
          <a href="/auth/signin" className="btn btn-primary btn-large">
            Go to sign in
            <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
