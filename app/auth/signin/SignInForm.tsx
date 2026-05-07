"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [tab, setTab] = useState<"magic" | "password">("magic");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(translateError(initialError));

  const onMagic = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim().toLowerCase();
    try {
      await signIn("resend", { email, redirectTo: callbackUrl ?? "/portal" });
    } catch {
      setError("Couldn't send the magic link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: (fd.get("email") as string).trim().toLowerCase(),
      password: fd.get("password") as string,
      redirect: false,
    });
    setSubmitting(false);
    if (result?.error) {
      setError("Email or password is incorrect.");
    } else if (result?.ok) {
      window.location.href = callbackUrl ?? "/portal";
    }
  };

  return (
    <>
      {/* Tab switcher */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          marginBottom: 24,
          background: "var(--bg-surface)",
          borderRadius: 999,
          padding: 4,
        }}
      >
        {([
          ["magic", "Magic link"],
          ["password", "Password"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setError(null);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              fontFamily: "'Geist', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              background: tab === id ? "var(--text)" : "transparent",
              color: tab === id ? "var(--bg)" : "var(--text-soft)",
              transition: "all 0.2s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "magic" ? (
        <form onSubmit={onMagic} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="magic-email">
              Email<span className="req">·</span>
            </label>
            <input
              className="form-input"
              id="magic-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
            />
            <p className="form-help">We'll email you a single-use link to sign in.</p>
          </div>

          {error && (
            <div className="form-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-large btn-block" disabled={submitting}>
            {submitting ? "Sending link…" : "Send magic link"}
            {!submitting && <span className="arrow" aria-hidden="true">→</span>}
          </button>
        </form>
      ) : (
        <form onSubmit={onPassword} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="pw-email">
              Email<span className="req">·</span>
            </label>
            <input
              className="form-input"
              id="pw-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pw-password">
              Password<span className="req">·</span>
            </label>
            <input
              className="form-input"
              id="pw-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="form-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-large btn-block" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
            {!submitting && <span className="arrow" aria-hidden="true">→</span>}
          </button>
        </form>
      )}
    </>
  );
}

function translateError(err?: string): string | null {
  if (!err) return null;
  const map: Record<string, string> = {
    CredentialsSignin: "Email or password is incorrect.",
    OAuthAccountNotLinked: "An account with that email already exists with a different sign-in method.",
    EmailSignin: "Couldn't send the magic link. Please try again.",
    SessionRequired: "Please sign in to continue.",
    Verification: "That magic link has expired or already been used. Request a new one.",
  };
  return map[err] ?? "Something went wrong. Please try again.";
}
