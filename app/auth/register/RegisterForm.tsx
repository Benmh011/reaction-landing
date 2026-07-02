"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: (fd.get("name") as string) || undefined,
      email: fd.get("email") as string,
    };
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Something went wrong — please try again.");
      else {
        setEmail(payload.email);
        setDone(true);
      }
    } catch {
      setError("Couldn't reach the server — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div>
        <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "1.4rem", margin: "0 0 12px", color: "var(--text)" }}>
          Check your inbox.
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text-soft)", lineHeight: 1.65, margin: 0 }}>
          We&rsquo;ve sent a sign-in link to <strong>{email}</strong>. Click it and your
          account is live — no password to remember, the link is the key. (If you already
          had an account, the same link simply signs you in.)
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="name">Your name</label>
        <input className="form-input" id="name" name="name" type="text" autoComplete="name" maxLength={120} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email<span className="req">·</span></label>
        <input className="form-input" id="email" name="email" type="email" autoComplete="email" required maxLength={200} />
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: "0.9rem", margin: "0 0 16px" }}>{error}</p>
      )}
      <button type="submit" className="btn btn-primary btn-large" disabled={submitting}>
        {submitting ? "Creating…" : "Create account"}
        <span className="arrow" aria-hidden="true">→</span>
      </button>
      <p className="mono" style={{ marginTop: 20, fontSize: "0.74rem", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <Link href="/auth/signin" style={{ color: "var(--reaction)" }}>Sign in</Link>
      </p>
    </form>
  );
}
