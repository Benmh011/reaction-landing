"use client";

import { useState } from "react";

export default function PilotSignupPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/pilot/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  // ───────────── SUCCESS STATE ─────────────
  if (submitted) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: 16, color: "var(--text)" }}>
            Check your inbox
          </h1>
          <p
            style={{
              color: "var(--text-soft)",
              fontSize: "1rem",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            We&rsquo;ve sent a sign-in link to <strong>{email}</strong>. Click it to
            access the pilot. The link is single-use and expires in 24&nbsp;hours.
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              lineHeight: 1.6,
            }}
          >
            Didn&rsquo;t receive it? Check your spam folder. If it still
            hasn&rsquo;t arrived after a few minutes, you can return to{" "}
            <a
              href="/pilot"
              onClick={(ev) => {
                ev.preventDefault();
                setSubmitted(false);
              }}
              style={{ color: "var(--reaction)", textDecoration: "underline" }}
            >
              try again
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  // ───────────── SIGN-UP FORM ─────────────
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: 8, color: "var(--text)" }}>
            Join the Reaction pilot
          </h1>
          <p style={{ color: "var(--text-soft)", lineHeight: 1.6 }}>
            Sign in with your university email to access the pilot board.
            Everything you log here helps your university evidence student
            experience and educational gains.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>
                First name
              </span>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--rule)",
                  background: "var(--input-bg)",
                  borderRadius: 8,
                  fontSize: "0.95rem",
                  color: "var(--text)",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>
                Last name
              </span>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--rule)",
                  background: "var(--input-bg)",
                  borderRadius: 8,
                  fontSize: "0.95rem",
                  color: "var(--text)",
                }}
              />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>
              University email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@plymouth.ac.uk"
              autoComplete="email"
              style={{
                padding: "10px 12px",
                border: "1px solid var(--rule)",
                background: "var(--input-bg)",
                borderRadius: 8,
                fontSize: "0.95rem",
                color: "var(--text)",
              }}
            />
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              We&rsquo;ll send you a single-use sign-in link &mdash; no password to remember.
            </span>
          </label>

          {error && (
            <div
              role="alert"
              style={{
                padding: "10px 14px",
                background: "rgba(185, 28, 28, 0.06)",
                border: "1px solid rgba(185, 28, 28, 0.25)",
                borderRadius: 8,
                color: "var(--danger)",
                fontSize: "0.875rem",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ marginTop: 8, justifyContent: "center" }}
          >
            {submitting ? "Sending\u2026" : "Send sign-in link"}
            {!submitting && (
              <span className="arrow" aria-hidden="true">
                &rarr;
              </span>
            )}
          </button>

          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: 12,
              lineHeight: 1.55,
            }}
          >
            By signing up you agree to take part in a pilot. Your reflections will
            be captured to evidence student outcomes for your university. You can
            request deletion of your data at any time.
          </p>
        </form>
      </div>
    </main>
  );
}
