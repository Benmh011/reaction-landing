"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string | null;
  organisation: string | null;
  role: "ADMIN" | "CLIENT";
  requestType: "UNIVERSITY" | "STUDENTS_UNION" | "EMPLOYER" | "CHARITY" | "OTHER";
  demoVersion: string | null;
  createdAt: string;
};

const TYPE_DISPLAY: Record<User["requestType"], { label: string; colour: string }> = {
  UNIVERSITY:    { label: "University",     colour: "#0d9488" },
  STUDENTS_UNION:{ label: "Students' Union",colour: "#7c3aed" },
  EMPLOYER:      { label: "Employer",       colour: "#1e3a5f" },
  CHARITY:       { label: "Charity",        colour: "#be185d" },
  OTHER:         { label: "Other",          colour: "#6b7280" },
};

export default function UserRow({ user, isSelf = false }: { user: User; isSelf?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [demoVersion, setDemoVersion] = useState(user.demoVersion ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const typeConfig = TYPE_DISPLAY[user.requestType] ?? TYPE_DISPLAY.OTHER;

  const save = async () => {
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demoVersion: demoVersion || null,
          password: password || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg({ type: "err", text: j.error || "Save failed" });
      } else {
        setMsg({ type: "ok", text: password ? "Saved · password set" : "Saved" });
        setPassword("");
        router.refresh();
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    // Two-step confirm: first explains, second is final
    const userLabel = user.name ? `${user.name} (${user.email})` : user.email;
    const confirmed = confirm(
      `Delete ${userLabel}?\n\n` +
        `This will:\n` +
        `  • Permanently remove their account\n` +
        `  • End any active sessions\n` +
        `  • Unlink them from their original demo request\n\n` +
        `This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg({ type: "err", text: j.error || "Delete failed" });
        setDeleting(false);
        return;
      }
      // Success — refresh the user list. The current row will vanish.
      router.refresh();
    } catch {
      setMsg({ type: "err", text: "Network error" });
      setDeleting(false);
    }
  };

  const created = new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontVariationSettings: '"opsz" 96', fontSize: "1.05rem", letterSpacing: "-0.012em" }}>
              {user.name || user.email}
            </span>
            {user.role === "ADMIN" ? (
              <span className="badge badge-rejected">admin</span>
            ) : (
              <span
                className="mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "0.65rem",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "3px 9px",
                  borderRadius: 999,
                  color: typeConfig.colour,
                  border: `1px solid ${typeConfig.colour}40`,
                  background: `${typeConfig.colour}10`,
                }}
              >
                {typeConfig.label}
              </span>
            )}
            {isSelf && (
              <span
                className="mono"
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--rule)",
                }}
              >
                You
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginBottom: 4 }}>
            {user.organisation || "—"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {user.email} · joined {created}
            {user.demoVersion && (
              <span> · build: <span className="mono" style={{ color: "var(--reaction)" }}>{user.demoVersion}</span></span>
            )}
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="btn btn-ghost">
          {open ? "Close" : "Edit"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16, padding: 20, background: "var(--bg-surface)", borderRadius: 12, border: "1px solid var(--rule)" }}>
          <div className="form-group">
            <label className="form-label">Demo version</label>
            <input
              className="form-input"
              type="text"
              value={demoVersion}
              onChange={(e) => setDemoVersion(e.target.value)}
              placeholder="default"
            />
            <p className="form-help">Folder name under /private-demos/. Leave blank to show the placeholder.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Set / reset password (optional)</label>
            <input
              className="form-input"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep existing"
              autoComplete="new-password"
            />
            <p className="form-help">Backup login for users who can't receive emails. Min 10 chars.</p>
          </div>

          {msg && (
            <div
              style={{
                padding: "10px 12px",
                marginBottom: 12,
                borderRadius: 8,
                fontSize: "0.85rem",
                background: msg.type === "ok" ? "color-mix(in srgb, var(--success) 8%, transparent)" : "color-mix(in srgb, var(--danger) 8%, transparent)",
                color: msg.type === "ok" ? "var(--success)" : "var(--danger)",
                border: `1px solid color-mix(in srgb, ${msg.type === "ok" ? "var(--success)" : "var(--danger)"} 30%, transparent)`,
              }}
            >
              {msg.text}
            </div>
          )}

          <button onClick={save} className="btn btn-primary" disabled={submitting || deleting}>
            {submitting ? "Saving…" : "Save changes"}
          </button>

          {/* ───── DANGER ZONE ───── */}
          {/* Only shown for non-self users. Self-protection guarded server-side too. */}
          {!isSelf && (
            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)",
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--danger)",
                  marginBottom: 8,
                }}
              >
                Danger zone
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", margin: "0 0 12px", lineHeight: 1.5 }}>
                Permanently remove this user. They lose access immediately. Their original demo
                request stays in the system as a record but no longer links to a user.
              </p>
              <button
                onClick={handleDelete}
                disabled={submitting || deleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: deleting ? "not-allowed" : "pointer",
                  background: deleting
                    ? "color-mix(in srgb, var(--danger) 40%, transparent)"
                    : "var(--danger)",
                  color: "#fff",
                  border: "none",
                  transition: "background 0.15s ease",
                }}
              >
                {deleting ? "Deleting…" : "Delete user"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
