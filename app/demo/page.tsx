import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import DemoRequestForm from "./DemoRequestForm";
import LaunchDemoCard from "./LaunchDemoCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a demo",
  description:
    "See a locally hosted multi-agentic system working inside a real business. Book a walkthrough, or launch a live demo.",
  openGraph: {
    title: "Book a demo · Reaction",
    description: "See a locally hosted multi-agentic system working inside a real business.",
    url: "https://reaction.org.uk/demo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Book a demo · Reaction",
    description: "See a locally hosted multi-agentic system working inside a real business.",
  },
  alternates: {
    canonical: "https://reaction.org.uk/demo",
  },
};

export default async function DemoPage() {
  // The launchable catalogue — managed at /admin/demos. Fail-soft: if the
  // table is missing or the query errors, the page still renders the form.
  let demos: { id: string; slug: string; name: string; description: string; launchUrl: string }[] = [];
  try {
    demos = await prisma.demo.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, slug: true, name: true, description: true, launchUrl: true },
    });
  } catch {
    demos = [];
  }

  return (
    <>
      <SiteNav />

      <section style={{ padding: "80px 0 60px" }}>
        <div className="container-narrow">
          <div className="page-eyebrow">Demo</div>
          <h1 className="page-title">
            See <em>Reaction</em> inside a working business.
          </h1>
          <p className="page-lede">
            Two ways to start. Register your interest below and we&rsquo;ll come back within two working
            days to walk you through what a locally hosted multi-agentic system would look like built
            around your workflows. Or launch a live demo — real software, doing a real business&rsquo;s work.
          </p>

          {/* ── Launch: the live demo catalogue ── */}
          <div className="panel" style={{ marginBottom: 32 }} id="launch">
            <div
              className="mono"
              style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--reaction)", marginBottom: 14 }}
            >
              01 · Launch a live demo
            </div>
            {demos.length === 0 ? (
              <p style={{ fontSize: "0.95rem", color: "var(--text-soft)", margin: 0, lineHeight: 1.6 }}>
                Live demos are being staged at the moment — register your interest below and we&rsquo;ll
                send you a link the moment one is ready.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {demos.map((d) => (
                  <LaunchDemoCard key={d.id} demo={d} />
                ))}
              </div>
            )}
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "18px 0 0", lineHeight: 1.5 }}>
              Demos are protected by their own sign-in. If you haven&rsquo;t been issued credentials yet,
              register below and we&rsquo;ll arrange access.
            </p>
          </div>

          {/* ── Register interest ── */}
          <div className="panel" id="register">
            <div
              className="mono"
              style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--reaction)", marginBottom: 14 }}
            >
              02 · Book a walkthrough
            </div>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "1.5rem", margin: "0 0 6px", letterSpacing: "-0.015em" }}>
              Register your interest
            </h2>
            <p style={{ fontSize: "0.92rem", color: "var(--text-soft)", margin: "0 0 24px" }}>
              Required fields marked <span style={{ color: "var(--reaction)" }}>·</span>
            </p>
            <DemoRequestForm />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
