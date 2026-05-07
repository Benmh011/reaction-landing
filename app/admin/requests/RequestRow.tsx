"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Request = {
  id: string;
  createdAt: string;
  email: string;
  name: string;
  organisation: string;
  role: string | null;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string | null;
};

export default function RequestRow({ request }: { request: Request }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoVersion, setDemoVersion] = useState("default");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const created = new Date(request.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const act = async (action: "approve" | "reject", payload: Record<string, unknown> = {}) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || `Failed to ${action}.`);
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const badge =
    request.status === "PENDING" ? "badge-pending" : request.status === "APPROVED" ? "badge-approved" : "badge-rejected";

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontVariationSettings: '"opsz" 96', fontSize: "1.1rem", color: "var(--text)", letterSpacing: "-0.012em" }}>
              {request.organisation}
            </span>
            <span className={`badge ${badge}`}>{request.status.toLowerCase()}</span>
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-soft)", marginBottom: 4 }}>
            {request.name}
            {request.role && <span style={{ color: "var(--text-muted)" }}> · {request.role}</span>}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            <a href={`mailto:${request.email}`} style={{ color: "inherit", textDecoration: "none" }}>
              {request.email}
            </a>
            <span> · {created}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {request.status === "PENDING" ? (
            <>
              <button onClick={() => setOpen(!open)} className="btn btn-ghost" disabled={submitting}>
                {open ? "Cancel" : "Review"}
              </button>
            </>
          ) : (
            <button onClick={() => setOpen(!open)} className="btn btn-ghost">
              {open ? "Close" : "Details"}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          style={{
            marginTop: 16,
            padding: 20,
            background: "var(--bg-surface)",
            borderRadius: 12,
            border: "1px solid var(--rule)",
          }}
        >
          {request.message && (
            <div style={{ marginBottom: 16 }}>
              <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                Their message
              </div>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-soft)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {request.message}
              </p>
            </div>
          )}

          {request.status === "PENDING" && (
            <div style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor={`dv-${request.id}`}>
                  Demo version (folder under /public/demos/)
                </label>
                <input
                  id={`dv-${request.id}`}
                  className="form-input"
                  type="text"
                  value={demoVersion}
                  onChange={(e) => setDemoVersion(e.target.value)}
                  placeholder="default"
                />
                <p className="form-help">Leave as 'default' if no bespoke build yet — they'll see the placeholder portal.</p>
              </div>

              {error && (
                <div className="form-error" style={{ marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => act("approve", { demoVersion: demoVersion || "default" })}
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Approving…" : "Approve & send magic link"}
                  {!submitting && <span className="arrow">→</span>}
                </button>
                <button
                  onClick={() => {
                    if (confirm("Reject this request?")) act("reject");
                  }}
                  className="btn btn-danger"
                  disabled={submitting}
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
