import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TenureApp from "./TenureApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tenure — property management demo",
  description:
    "A private demonstration build for a South Devon property management practice.",
  // A gated demo must never appear in search results.
  robots: { index: false, follow: false },
};

// Who may open this demo:
//  · ADMIN — always
//  · a signed-in user whose demoVersion was set to "tenure" on approval
// demoVersion is the existing per-user pointer the admin flow sets when a
// demo request is approved, so granting access is a normal user edit —
// no new machinery. One demo per account: setting this slug replaces
// whatever the account held before.
const DEMO_SLUG = "tenure";

export default async function TenurePage() {
  const session = await auth();

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/demos/tenure")}`);
  }

  const entitled =
    session.user.role === "ADMIN" || session.user.demoVersion === DEMO_SLUG;

  if (!entitled) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "var(--bg)",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#6d6759",
              marginBottom: 10,
            }}
          >
            REACTION · DEMONSTRATION
          </p>
          <h1
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: 38,
              lineHeight: 1.05,
              marginBottom: 10,
            }}
          >
            This demo isn&apos;t on your account yet.
          </h1>
          <p style={{ fontSize: 14.5, color: "#6d6759", marginBottom: 24 }}>
            You&apos;re signed in as {session.user.email}, but Tenure hasn&apos;t
            been added to this account. Request access and we&apos;ll switch it
            on for you.
          </p>
          <a className="btn btn-primary" href="/demo">
            Request access
          </a>
        </div>
      </main>
    );
  }

  return <TenureApp />;
}
