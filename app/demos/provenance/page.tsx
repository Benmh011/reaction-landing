import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProvenanceApp from "./ProvenanceApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Salcombe Dairy — demonstration",
  description: "A private demonstration environment.",
  // A gated demo must never appear in search results.
  robots: { index: false, follow: false },
};

// The two families for this demo, loaded here so they are scoped to this
// route: nothing else on the site picks them up. Fraunces carries names
// and titles; Plex carries everything read or typed, with Plex Mono for
// anything that is a record.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-fraunces",
  display: "swap",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const fontVars = `${fraunces.variable} ${plex.variable} ${plexMono.variable}`;

// Who may open this demo:
//  · ADMIN — always
//  · a signed-in user whose demoVersion was set to "provenance" on approval
// demoVersion is the existing per-user pointer the admin flow sets when a
// demo request is approved, so granting access is a normal user edit —
// no new machinery.
const DEMO_SLUG = "provenance";

export default async function ProvenancePage() {
  const session = await auth();

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/demos/provenance")}`);
  }

  const entitled =
    session.user.role === "ADMIN" || session.user.demoVersion === DEMO_SLUG;

  if (!entitled) {
    return (
      <main
        className={fontVars}
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#10284a",
          color: "#f4efe4",
          fontFamily: "var(--font-plex), system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <p style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: 22, marginBottom: 18 }}>
            Salcombe Dairy
          </p>
          <h1
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontWeight: 500,
              fontSize: 36,
              lineHeight: 1.08,
              marginBottom: 12,
            }}
          >
            This demo isn&rsquo;t on your account yet.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(244,239,228,0.78)", lineHeight: 1.55, marginBottom: 24 }}>
            You&rsquo;re signed in as {session.user.email}, but this demonstration hasn&rsquo;t been added to your
            account. Request access and we&rsquo;ll switch it on for you.
          </p>
          <a
            href="/demo"
            style={{
              display: "inline-block",
              background: "#c9a24a",
              color: "#10284a",
              fontWeight: 600,
              fontSize: 14.5,
              padding: "11px 22px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            Request access
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className={fontVars}>
      <ProvenanceApp user={session.user.email ?? null} />
    </div>
  );
}
