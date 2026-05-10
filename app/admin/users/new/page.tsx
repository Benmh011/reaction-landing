import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import AdminNav from "@/components/AdminNav";
import NewUserForm from "./NewUserForm";

export const metadata = { title: "Create user · Admin · Reaction" };
export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/portal");

  return (
    <>
      <SiteNav signOutHref="/auth/signout" />
      <AdminNav active="users" />

      <section style={{ padding: "20px 0 80px" }}>
        <div className="container-narrow">
          <div style={{ marginBottom: 8 }}>
            <Link
              href="/admin/users"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              ← Users
            </Link>
          </div>
          <div className="page-eyebrow">Admin · Pre-provision account</div>
          <h1 className="page-title">
            Create a <em>user</em> account.
          </h1>
          <p className="page-lede">
            Use this when you've spoken to a prospect and want to send them credentials directly — bypassing the
            self-service demo form. The user can sign in immediately with the email and password you set.
          </p>

          <div className="panel">
            <NewUserForm />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
