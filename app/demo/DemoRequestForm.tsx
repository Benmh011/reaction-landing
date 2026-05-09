"use client";

import { useState } from "react";

// Type → adaptive copy map. Drives form labels and placeholder text so the
// person filling it in feels addressed appropriately. The values are sent
// to the API as-is and stored on DemoRequest.requestType.
const TYPE_OPTIONS = [
  {
    value: "UNIVERSITY",
    label: "University",
    orgPlaceholder: "e.g. University of Plymouth",
    rolePlaceholder: "e.g. Head of Student Engagement · VP Education · Pro-Vice-Chancellor (Education)",
    messageLabel: "What would you like to see in your preview?",
    messagePlaceholder: "Anything specific to focus on — particular faculties, NSS or A&P alignment, integration questions.",
  },
  {
    value: "STUDENTS_UNION",
    label: "Students' Union",
    orgPlaceholder: "e.g. UPSU · Exeter Students' Guild",
    rolePlaceholder: "e.g. Sabbatical Officer · CEO · Head of Membership",
    messageLabel: "What would you like to see in your preview?",
    messagePlaceholder: "Anything specific — society engagement, volunteering coordination, employer connections.",
  },
  {
    value: "EMPLOYER",
    label: "Local employer / business",
    orgPlaceholder: "e.g. Babcock International · Princess Yachts",
    rolePlaceholder: "e.g. Talent Manager · Early Careers Lead · Head of HR",
    messageLabel: "What kind of opportunities would you post?",
    messagePlaceholder: "Internships, part-time roles, graduate schemes — and which universities you'd like to reach.",
  },
  {
    value: "CHARITY",
    label: "Charity / community group",
    orgPlaceholder: "e.g. Argyle Community Trust · Shekinah Mission",
    rolePlaceholder: "e.g. Volunteer Coordinator · Programme Manager",
    messageLabel: "What kind of opportunities would you post?",
    messagePlaceholder: "Volunteering needs, fundraising events, campaigns — and student capacity you're looking for.",
  },
  {
    value: "OTHER",
    label: "Other",
    orgPlaceholder: "Your organisation name",
    rolePlaceholder: "Your role",
    messageLabel: "Tell us more about what you're hoping to see",
    messagePlaceholder: "Anything you'd like us to know.",
  },
] as const;

type TypeValue = (typeof TYPE_OPTIONS)[number]["value"];

export default function DemoRequestForm() {
  const [type, setType] = useState<TypeValue>("UNIVERSITY");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = TYPE_OPTIONS.find((t) => t.value === type)!;

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
      requestType: type,
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
      {/* Type selector — drives the rest of the form's adaptive copy */}
      <div className="form-group">
        <label className="form-label" htmlFor="requestType">
          I represent a<span className="req">·</span>
        </label>
        <select
          className="form-select"
          id="requestType"
          name="requestType"
          value={type}
          onChange={(e) => setType(e.target.value as TypeValue)}
          required
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

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
          placeholder={config.orgPlaceholder}
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
          placeholder={config.rolePlaceholder}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="message">
          {config.messageLabel}
        </label>
        <textarea
          className="form-textarea"
          id="message"
          name="message"
          placeholder={config.messagePlaceholder}
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
