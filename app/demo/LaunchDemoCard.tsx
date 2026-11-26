"use client";

// A launchable demo entry. The destination software carries its own login
// wall — that's the access gate. On launch we record a lightweight
// DemoSession row (durationMs 0 = a launch event) so the analytics
// dashboard can count demo interest. Nothing is recorded from a browser that
// has counting switched off (the Privacy page).

import { sendCount } from "@/lib/visitCount";

type DemoEntry = {
  slug: string;
  name: string;
  description: string;
  launchUrl: string;
};

export default function LaunchDemoCard({ demo }: { demo: DemoEntry }) {
  // Sent as the page is about to go, so it survives the launch. It can never block it.
  const trackLaunch = () => sendCount({ type: "demo", slug: demo.slug, durationMs: 0 }, true);

  return (
    <div
      className="demo-launch-card"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 20,
        alignItems: "center",
        padding: "20px 22px",
        border: "1px solid var(--rule)",
        borderRadius: 14,
        background: "var(--bg-elevated)",
      }}
    >
      <div>
        <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "1.2rem", margin: "0 0 6px", letterSpacing: "-0.01em", color: "var(--text)" }}>
          {demo.name}
        </h3>
        <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", margin: 0, lineHeight: 1.55 }}>
          {demo.description}
        </p>
      </div>
      <a
        href={demo.launchUrl}
        className="btn btn-primary"
        onClick={trackLaunch}
        style={{ whiteSpace: "nowrap" }}
      >
        Launch demo
        <span className="arrow" aria-hidden="true">→</span>
      </a>
    </div>
  );
}
