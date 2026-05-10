import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import AdminNav from "@/components/AdminNav";
import { prisma } from "@/lib/prisma";
import UserRow from "./UserRow";

export const metadata = { title: "Users · Admin · Reaction" };
export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/portal");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      organisation: true,
      role: true,
      requestType: true,
      demoVersion: true,
      createdAt: true,
    },
  });

  // Serialize dates for the client component
  const serialized = users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const clientCount = users.length - adminCount;

  return (
    <>
      <SiteNav signOutHref="/auth/signout" />
      <AdminNav active="users" />

      <section style={{ padding: "20px 0 80px" }}>
        <div className="container">
          <div className="page-eyebrow">Admin</div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <h1 className="page-title" style={{ margin: 0 }}>
              Users <span style={{ color: "var(--text-muted)", fontSize: "0.5em", fontStyle: "normal" }}>({users.length})</span>
            </h1>
            <Link href="/admin/users/new" className="btn btn-primary">
              Create user
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </div>
          <p style={{ fontSize: "0.92rem", color: "var(--text-soft)", margin: "0 0 32px" }}>
            {adminCount} admin{adminCount === 1 ? "" : "s"} · {clientCount} client{clientCount === 1 ? "" : "s"}.
          </p>

          {users.length === 0 ? (
            <div className="panel" style={{ padding: 48, textAlign: "center" }}>
              <p style={{ fontSize: "1rem", color: "var(--text-soft)", margin: 0 }}>No users yet.</p>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0 }}>
              {serialized.map((u, i) => (
                <div
                  key={u.id}
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--rule)" }}
                >
                  <UserRow user={u} isSelf={u.id === session.user.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
