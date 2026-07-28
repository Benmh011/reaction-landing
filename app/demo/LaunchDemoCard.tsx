"use client";

// A launchable demo entry. The destination software carries its own login
// wall — that's the access gate. On launch we record a lightweight
// DemoSession row (durationMs 0 = a launch event) so the analytics
// dashboard can count demo interest.

type DemoEntry = {
  slug: string;
  name: string;
  description: string;
  launchUrl: string;
};

function sessionId(): string {
  try {
    const KEY = "rx_sid";
    let sid = localStorage.getItem(KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)) + Date.now().toString(36);
      localStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return "anon-" + Date.now().toString(36);
  }
}

export default function LaunchDemoCard({ demo }: { demo: DemoEntry }) {
  const trackLaunch = () => {
    try {
      const payload = JSON.stringify({
        type: "demo",
        slug: demo.slug,
        durationMs: 0,
        sessionId: sessionId(),
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      }
    } catch {
      /* tracking must never block the launch */
    }
  };

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
