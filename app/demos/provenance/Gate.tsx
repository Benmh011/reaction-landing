"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Gate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demos/provenance/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "That password isn't right.");
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

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
      <div style={{ width: "100%", maxWidth: 380 }}>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--text-muted, #6d6759)",
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
            fontSize: 42,
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          Provenance
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text-muted, #6d6759)", marginBottom: 26 }}>
          The practice system for a working food producer. Enter the access
          password from your invitation to open the demonstration.
        </p>

        <label
          htmlFor="demo-password"
          style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}
        >
          Access password
        </label>
        <input
          id="demo-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
          style={{
            width: "100%",
            padding: "11px 13px",
            fontSize: 15,
            fontFamily: "'JetBrains Mono', monospace",
            border: "1px solid var(--rule-strong)",
            borderRadius: 10,
            background: "var(--bg-elevated)",
            marginBottom: 12,
          }}
        />
        {error && (
          <p style={{ color: "var(--accent)", fontSize: 13.5, marginBottom: 12 }}>{error}</p>
        )}
        <button className="btn btn-primary" onClick={submit} disabled={busy} style={{ width: "100%" }}>
          {busy ? "Checking…" : "Open the demo"}
        </button>

        <p style={{ fontSize: 12.5, color: "var(--text-muted, #6d6759)", marginTop: 22 }}>
          No password? <a href="/demo" style={{ color: "var(--accent)" }}>Book a walkthrough</a> and
          we'll send one over.
        </p>
      </div>
    </main>
  );
}
