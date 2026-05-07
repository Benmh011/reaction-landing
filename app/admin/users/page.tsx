import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/prisma";
import UserRow from "./UserRow";

export const metadata = { title: "Users · Admin · Reaction" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/portal");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <>
      <SiteNav signOutHref="/auth/signout" />
      <section style={{ padding: "60px 0 32px" }}>
        <div className="container">
          <div className="page-eyebrow">Admin · Users</div>
          <h1 className="page-title"><em>Users</em>.</h1>
          <p className="page-lede">Update which build of Reaction each client sees, or set a fallback password.</p>
          <Link href="/admin" style={{ color: "var(--reaction)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>
            ← Back to admin
          </Link>
        </div>
      </section>

      <section style={{ padding: "0 0 80px" }}>
        <div className="container">
          <div className="panel" style={{ padding: 0 }}>
            {users.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--text-soft)" }}>
                No users yet.
              </div>
            ) : (
              users.map((u, i) => (
                <div key={u.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--rule)" }}>
                  <UserRow user={JSON.parse(JSON.stringify(u))} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
