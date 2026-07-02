"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/vet/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed");
        setBusy(false);
        return;
      }
      // Send them to where they were heading, or the demo.
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("from") || "/demos/southmoor";
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-brand">Reaction</div>
        <h1 className="login-title">Southmoor Vets — Demo Access</h1>
        <p className="login-sub">
          This demo is private. Sign in with the credentials provided to you.
        </p>

        <label className="login-label">Email</label>
        <input
          className="login-input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={onKey}
          placeholder="you@practice.co.uk"
        />

        <label className="login-label">Password</label>
        <input
          className="login-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={onKey}
          placeholder="••••••••"
        />

        {error && <div className="login-error">{error}</div>}

        <button className="login-btn" onClick={submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="login-foot">
          No account? Access is granted by Reaction. Contact us to request a demo login.
        </p>
      </div>
    </main>
  );
}
