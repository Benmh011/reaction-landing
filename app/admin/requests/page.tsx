import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/prisma";
import RequestRow from "./RequestRow";

export const metadata = { title: "Demo requests · Admin · Reaction" };
export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/portal");

  const requests = await prisma.demoRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <>
      <SiteNav signOutHref="/auth/signout" />
      <section style={{ padding: "60px 0 32px" }}>
        <div className="container">
          <div className="page-eyebrow">Admin · Requests</div>
          <h1 className="page-title">Demo <em>requests</em>.</h1>
          <p className="page-lede">
            Review pending requests and approve to create the user account. Approving sends a magic-link sign-in email
            automatically.
          </p>
          <Link href="/admin" style={{ color: "var(--reaction)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>
            ← Back to admin
          </Link>
        </div>
      </section>

      <section style={{ padding: "0 0 80px" }}>
        <div className="container">
          <div className="panel" style={{ padding: 0 }}>
            {requests.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--text-soft)" }}>
                <p style={{ margin: 0 }}>No demo requests yet.</p>
              </div>
            ) : (
              <div>
                {requests.map((r, i) => (
                  <div
                    key={r.id}
                    style={{
                      borderTop: i === 0 ? "none" : "1px solid var(--rule)",
                    }}
                  >
                    <RequestRow request={JSON.parse(JSON.stringify(r))} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
