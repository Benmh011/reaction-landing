import Link from "next/link";

// Small navigation strip for admin pages. Sits below SiteNav.
// Provides quick navigation between admin sections plus a "Dashboard" link
// that takes the admin to /portal — useful for previewing what regular users see.
//
// Usage: drop <AdminNav active="..." /> at the top of each admin page,
// where active is one of: "home", "requests", "users".

export default function AdminNav({ active = "home" }: { active?: "home" | "requests" | "users" }) {
  const linkStyle = (isActive: boolean) => ({
    display: "inline-flex" as const,
    alignItems: "center" as const,
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: "0.88rem",
    fontWeight: 500,
    textDecoration: "none",
    color: isActive ? "var(--text)" : "var(--text-soft)",
    background: isActive ? "var(--bg-elevated)" : "transparent",
    border: isActive ? "1px solid var(--rule)" : "1px solid transparent",
    transition: "all 0.15s ease",
  });

  return (
    <div
      style={{
        padding: "16px 0",
        borderBottom: "1px solid var(--rule)",
        marginBottom: 32,
        background: "var(--bg-surface)",
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            className="mono"
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--reaction)",
              marginRight: 14,
              paddingLeft: 4,
            }}
          >
            Admin
          </span>
          <Link href="/admin" style={linkStyle(active === "home")}>
            Overview
          </Link>
          <Link href="/admin/requests" style={linkStyle(active === "requests")}>
            Requests
          </Link>
          <Link href="/admin/users" style={linkStyle(active === "users")}>
            Users
          </Link>
        </div>

        {/* Dashboard button — takes admin to /portal to preview what clients see */}
        <Link
          href="/portal"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: "0.85rem",
            fontWeight: 500,
            textDecoration: "none",
            color: "var(--text)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--rule)",
            transition: "all 0.15s ease",
          }}
        >
          <span aria-hidden="true">←</span>
          View as user (Dashboard)
        </Link>
      </div>
    </div>
  );
}
