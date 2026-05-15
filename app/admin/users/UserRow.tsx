"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string | null;
  organisation: string | null;
  role: "ADMIN" | "CLIENT" | "STUDENT";
  demoVersion: string | null;
  createdAt: string;
};

export default function UserRow({ user, isSelf }: { user: User; isSelf?: boolean }) {
  // isSelf is accepted here so admin/users/page.tsx can flag the row representing
  // the currently-signed-in admin. Visual treatment (e.g. "(you)" tag, locked
  // controls) is intentionally minimal for now — the prop existed in a previous
  // iteration of this component and was lost when the file was regenerated.
  // Suppress unused-var warnings without changing behaviour:
  void isSelf;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [demoVersion, setDemoVersion] = useState(user.demoVersion ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

  const created = new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  // Role → badge class. STUDENT gets a pending/neutral style so it reads
  // distinctly from CLIENT (the founder/champion accounts).
  const roleBadgeClass =
    user.role === "ADMIN" ? "badge-rejected"
    : user.role === "STUDENT" ? "badge-pending"
    : "badge-approved";

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontVariationSettings: '"opsz" 96', fontSize: "1.05rem", letterSpacing: "-0.012em" }}>
              {user.name || user.email}
            </span>
            <span className={`badge ${roleBadgeClass}`}>{user.role.toLowerCase()}</span>
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
            <p className="form-help">Folder name under /public/demos/. Leave blank to show the placeholder.</p>
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

          <button onClick={save} className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
