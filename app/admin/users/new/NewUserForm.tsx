"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Type options match the existing RequestType enum.
// defaultSlug is what we pre-fill in Demo Version when this type is chosen.
const TYPE_OPTIONS = [
  { value: "UNIVERSITY",     label: "University",            defaultSlug: "default" },
  { value: "STUDENTS_UNION", label: "Students' Union",       defaultSlug: "default" },
  { value: "EMPLOYER",       label: "Local employer",        defaultSlug: "employer" },
  { value: "CHARITY",        label: "Charity",               defaultSlug: "employer" },
  { value: "OTHER",          label: "Other",                 defaultSlug: "default" },
] as const;

type TypeValue = (typeof TYPE_OPTIONS)[number]["value"];

export default function NewUserForm() {
  const router = useRouter();

  // Form state
  const [email, setEmail]               = useState("");
  const [name, setName]                 = useState("");
  const [organisation, setOrganisation] = useState("");
  const [requestType, setRequestType]   = useState<TypeValue>("UNIVERSITY");
  const [demoVersion, setDemoVersion]   = useState("default");
  const [password, setPassword]         = useState("");

  // UI state
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Success state — credentials shown ONCE and never again
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  // When type changes, also update the demoVersion to the type's default
  // (admin can still override afterwards)
  const handleTypeChange = (next: TypeValue) => {
    setRequestType(next);
    const config = TYPE_OPTIONS.find((t) => t.value === next);
    if (config) setDemoVersion(config.defaultSlug);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, organisation, requestType, demoVersion, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create user");
        setSubmitting(false);
        return;
      }
      // Hold credentials in component state. The plain password is NOT persisted
      // anywhere — only the bcrypt hash is in the DB. Admin must copy now.
      setCreated({ email: json.email, password });
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  // ─── Success view: one-time credentials display ───
  if (created) {
    return (
      <SuccessCard
        email={created.email}
        password={created.password}
        onCreateAnother={() => {
          // Reset all state for another create
          setEmail("");
          setName("");
          setOrganisation("");
          setRequestType("UNIVERSITY");
          setDemoVersion("default");
          setPassword("");
          setCreated(null);
          setSubmitting(false);
          setError(null);
        }}
        onDone={() => {
          router.push("/admin/users");
        }}
      />
    );
  }

  // ─── Form view ───
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Login email<span className="req">·</span>
        </label>
        <input
          className="form-input"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. supres@plymouth.reaction.org.uk"
          required
          autoComplete="off"
        />
        <p className="form-help">
          The address the user types to sign in. Doesn't need a real inbox — pick something memorable.
          Convention: <span className="mono">&lt;role&gt;@&lt;institution&gt;.reaction.org.uk</span>
        </p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Name<span className="req">·</span>
        </label>
        <input
          className="form-input"
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Their name, or a description like 'Plymouth VP Demo'"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="organisation">
          Organisation<span className="req">·</span>
        </label>
        <input
          className="form-input"
          id="organisation"
          type="text"
          value={organisation}
          onChange={(e) => setOrganisation(e.target.value)}
          placeholder="University of Plymouth · Tamar Defence Engineering · etc."
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="requestType">
          Account type<span className="req">·</span>
        </label>
        <select
          className="form-select"
          id="requestType"
          value={requestType}
          onChange={(e) => handleTypeChange(e.target.value as TypeValue)}
          required
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="form-help">Drives the type badge in /admin/users and the default demo build.</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="demoVersion">
          Demo version<span className="req">·</span>
        </label>
        <input
          className="form-input"
          id="demoVersion"
          type="text"
          value={demoVersion}
          onChange={(e) => setDemoVersion(e.target.value)}
          placeholder="e.g. plymouth · exeter · employer · default"
          required
        />
        <p className="form-help">
          Folder name under /private-demos/. Defaulted from account type — change if needed.
        </p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password<span className="req">·</span>
        </label>
        <input
          className="form-input"
          id="password"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 10 characters"
          minLength={10}
          required
          autoComplete="new-password"
        />
        <p className="form-help">
          You'll see this once on the next screen. Write it down or copy it — it's hashed in the database after that
          and not retrievable.
        </p>
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

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary btn-large" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
          {!submitting && <span className="arrow">→</span>}
        </button>
        <Link href="/admin/users" className="btn btn-ghost btn-large">
          Cancel
        </Link>
      </div>
    </form>
  );
}

// ─── Success card: shown once after creation ───
function SuccessCard({
  email,
  password,
  onCreateAnother,
  onDone,
}: {
  email: string;
  password: string;
  onCreateAnother: () => void;
  onDone: () => void;
}) {
  const [emailCopied, setEmailCopied]       = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [bothCopied, setBothCopied]         = useState(false);

  const copy = async (text: string, setter: (b: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 1800);
    } catch {
      // Clipboard API can fail on insecure origins — fall back to a prompt
      window.prompt("Copy this manually:", text);
    }
  };

  const copyBoth = () => {
    const block = `Email: ${email}\nPassword: ${password}\nSign in: https://reaction.org.uk/auth/signin`;
    copy(block, setBothCopied);
  };

  return (
    <div>
      <div
        style={{
          padding: "20px 22px",
          marginBottom: 24,
          borderRadius: 12,
          background: "color-mix(in srgb, var(--success) 6%, transparent)",
          border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--success)",
            marginBottom: 8,
          }}
        >
          ✓ Account created
        </div>
        <p style={{ fontSize: "0.95rem", color: "var(--text-soft)", margin: 0, lineHeight: 1.55 }}>
          Send these credentials to the user through your own channel. The password is shown only on this
          screen — once you leave, it's gone for good.
        </p>
      </div>

      <CredentialRow
        label="Email (login)"
        value={email}
        copied={emailCopied}
        onCopy={() => copy(email, setEmailCopied)}
      />
      <CredentialRow
        label="Password"
        value={password}
        copied={passwordCopied}
        onCopy={() => copy(password, setPasswordCopied)}
        mono
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
        <button onClick={copyBoth} className="btn btn-primary">
          {bothCopied ? "Copied ✓" : "Copy both"}
        </button>
        <button onClick={onCreateAnother} className="btn btn-ghost">
          Create another
        </button>
        <button onClick={onDone} className="btn btn-ghost">
          Done · back to users
        </button>
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
  mono = false,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="form-label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          borderRadius: 8,
          border: "1px solid var(--rule-strong)",
          background: "var(--bg-elevated)",
        }}
      >
        <code
          style={{
            flex: 1,
            fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
            fontSize: "0.95rem",
            color: "var(--text)",
            wordBreak: "break-all",
          }}
        >
          {value}
        </code>
        <button
          onClick={onCopy}
          type="button"
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            background: "transparent",
            color: "var(--text)",
            border: "1px solid var(--rule-strong)",
            cursor: "pointer",
            fontSize: "0.82rem",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
