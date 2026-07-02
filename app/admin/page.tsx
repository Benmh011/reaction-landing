import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import AdminNav from "@/components/AdminNav";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin · Reaction" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/");

  const [pendingCount, totalRequests, totalUsers] = await Promise.all([
    prisma.demoRequest.count({ where: { status: "PENDING" } }),
    prisma.demoRequest.count(),
    prisma.user.count(),
  ]);

  return (
    <>
      <SiteNav signOutHref="/auth/signout" />
      <section style={{ padding: "60px 0 40px" }}>
        <div className="container">
          <div className="page-eyebrow">Admin</div>
          <h1 className="page-title">
            <em>Reaction</em> control panel.
          </h1>
        </div>
      </section>

      <section style={{ padding: "0 0 80px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }} className="admin-stats">
            <Link href="/admin/requests" style={{ textDecoration: "none" }}>
              <div className="panel panel-tight" style={{ position: "relative" }}>
                <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                  Pending requests
                </div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontVariationSettings: '"opsz" 144', fontWeight: 600, fontSize: "2.5rem", color: pendingCount > 0 ? "var(--reaction)" : "var(--text)", lineHeight: 1 }}>
                  {pendingCount}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginTop: 6 }}>Awaiting your review</div>
              </div>
            </Link>
            <div className="panel panel-tight">
              <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Total requests
              </div>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontVariationSettings: '"opsz" 144', fontWeight: 600, fontSize: "2.5rem", color: "var(--text)", lineHeight: 1 }}>
                {totalRequests}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginTop: 6 }}>All-time</div>
            </div>
            <Link href="/admin/users" style={{ textDecoration: "none" }}>
              <div className="panel panel-tight">
                <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                  Active users
                </div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontVariationSettings: '"opsz" 144', fontWeight: 600, fontSize: "2.5rem", color: "var(--text)", lineHeight: 1 }}>
                  {totalUsers}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginTop: 6 }}>With portal access</div>
              </div>
            </Link>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/requests" className="btn btn-primary">
              Review requests
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="/admin/users" className="btn btn-ghost">
              Manage users
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <style>{`@media (max-width: 760px) { .admin-stats { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
