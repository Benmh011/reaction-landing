"use client";

import { useState } from "react";

/**
 * Business demo-request form. Posts to /api/demo-request:
 * requestType is always BUSINESS; the sector select is stored separately.
 */

const SECTORS = [
  "Veterinary & animal health",
  "Trades & home services",
  "Professional services",
  "Hospitality & leisure",
  "Retail & e-commerce",
  "Manufacturing & logistics",
  "Other",
] as const;

export default function DemoRequestForm() {
  const [sector, setSector] = useState<string>(SECTORS[0]);
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
      requestType: "BUSINESS",
      sector,
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
    } catch {
      setError("Couldn't reach the server. Please try again or email info@reaction.org.uk.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ padding: "28px 0 8px" }}>
        <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "1.3rem", margin: "0 0 10px", color: "var(--text)" }}>
          Received — thank you.
        </h3>
        <p style={{ fontSize: "0.95rem", color: "var(--text-soft)", lineHeight: 1.6, margin: 0 }}>
          We&rsquo;ll come back to you within two working days to arrange a walkthrough
          built around how your business actually works. If anything&rsquo;s urgent in the
          meantime: info@reaction.org.uk.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="sector">
          My business is in<span className="req">·</span>
        </label>
        <select
          className="form-select"
          id="sector"
          name="sector"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Your name<span className="req">·</span>
        </label>
        <input className="form-input" id="name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={120} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Work email<span className="req">·</span>
        </label>
        <input className="form-input" id="email" name="email" type="email" autoComplete="email" required maxLength={200} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="organisation">
          Business name<span className="req">·</span>
        </label>
        <input className="form-input" id="organisation" name="organisation" type="text" autoComplete="organization" required minLength={2} maxLength={200} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="role">
          Your role
        </label>
        <input className="form-input" id="role" name="role" type="text" autoComplete="organization-title" maxLength={120} placeholder="Owner, ops manager, practice manager…" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="message">
          What should the system take off your plate?
        </label>
        <textarea className="form-textarea" id="message" name="message" rows={4} maxLength={2000} placeholder="The workflows, queues, or paperwork you'd hand over first." />
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: "0.9rem", margin: "0 0 16px" }}>
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-large" disabled={submitting}>
        {submitting ? "Sending…" : "Register interest"}
        <span className="arrow" aria-hidden="true">→</span>
      </button>
    </form>
  );
}
