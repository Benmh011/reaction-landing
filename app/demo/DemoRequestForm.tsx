"use client";

import { useState } from "react";

export default function DemoRequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      organisation: fd.get("organisation") as string,
      role: (fd.get("role") as string) || undefined,
      message: (fd.get("message") as string) || undefined,
    };

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try emailing us directly.");
      } else {
        setDone(true);
      }
    } catch (err) {
      setError("Couldn't reach the server. Please try again or email info@reaction.org.uk.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          padding: "32px 24px",
          textAlign: "center",
          background: "color-mix(in srgb, var(--success) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
          borderRadius: 12,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--success)",
            marginBottom: 12,
          }}
        >
          ✓ Request received
        </div>
        <h3
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 600,
            fontVariationSettings: '"opsz" 96',
            fontSize: "1.4rem",
            margin: "0 0 12px",
            letterSpacing: "-0.015em",
          }}
        >
          Thanks — we'll be in touch.
        </h3>
        <p style={{ fontSize: "0.95rem", color: "var(--text-soft)", margin: 0, lineHeight: 1.55 }}>
          We'll review your request and reply within two working days at the email you provided. Until then, sit
          tight — and consider this the first action.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Your name<span className="req">·</span>
        </label>
        <input className="form-input" id="name" name="name" type="text" required autoComplete="name" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Work email<span className="req">·</span>
        </label>
        <input className="form-input" id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="organisation">
          Organisation<span className="req">·</span>
        </label>
        <input
          className="form-input"
          id="organisation"
          name="organisation"
          type="text"
          required
          autoComplete="organization"
          placeholder="University, students' union, or college name"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="role">
          Your role
        </label>
        <input
          className="form-input"
          id="role"
          name="role"
          type="text"
          autoComplete="organization-title"
          placeholder="e.g. VP Education · Head of Careers · Student Engagement Lead"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="message">
          What would you like to see?
        </label>
        <textarea
          className="form-textarea"
          id="message"
          name="message"
          placeholder="Anything specific you'd like to focus on — particular use cases, integration questions, timeline."
        />
      </div>

      {error && (
        <div
          style={{
            padding: "12px 14px",
            marginBottom: 16,
            borderRadius: 8,
            background: "color-mix(in srgb, var(--danger) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
            color: "var(--danger)",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-large btn-block" disabled={submitting}>
        {submitting ? "Sending…" : "Register interest"}
        {!submitting && (
          <span className="arrow" aria-hidden="true">→</span>
        )}
      </button>
    </form>
  );
}
