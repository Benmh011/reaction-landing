"use client";

import { useState, useEffect, useRef } from "react";

const SECTIONS = [
  { id: "top", label: "Overview" },
  { id: "laws", label: "The three laws" },
  { id: "law-1", label: "I · Inertia" },
  { id: "law-2", label: "II · Force" },
  { id: "law-3", label: "III · Reaction" },
  { id: "build", label: "What we build" },
  { id: "demo", label: "Book a demo" },
];

export default function SectionDropdown() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleNavigate = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // Update URL hash so back-button and copy-link both work
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close menu" : "Open menu"}
        style={{
          // Bare icon button — no border, no background, just three lines on the nav bar
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          margin: 0,
          background: "transparent",
          border: "none",
          color: "var(--text)",
          cursor: "pointer",
          // Square-ish hit area for the icon
          width: 38,
          height: 38,
          borderRadius: 6,
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-surface)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 22,
            height: 16,
            position: "relative",
          }}
        >
          {/* Top line — rotates 45° to form the upper diagonal of the X when open */}
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              background: "currentColor",
              borderRadius: 2,
              top: open ? 7 : 0,
              transform: open ? "rotate(45deg)" : "rotate(0)",
              transformOrigin: "center",
              transition: "transform 0.22s ease, top 0.22s ease",
            }}
          />
          {/* Middle line — fades out when open */}
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              background: "currentColor",
              borderRadius: 2,
              top: 7,
              opacity: open ? 0 : 1,
              transition: "opacity 0.15s ease",
            }}
          />
          {/* Bottom line — rotates -45° to form the lower diagonal of the X when open */}
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              background: "currentColor",
              borderRadius: 2,
              top: open ? 7 : 14,
              transform: open ? "rotate(-45deg)" : "rotate(0)",
              transformOrigin: "center",
              transition: "transform 0.22s ease, top 0.22s ease",
            }}
          />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            minWidth: 240,
            background: "var(--bg-elevated)",
            border: "1px solid var(--rule)",
            borderRadius: 12,
            boxShadow: "var(--shadow-cta)",
            padding: 6,
            zIndex: 50,
            // Soft entrance
            animation: "sectionDropdownIn 0.16s ease-out",
          }}
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              role="menuitem"
              onClick={handleNavigate(section.id)}
              style={{
                display: "block",
                padding: "10px 14px",
                borderRadius: 8,
                color: "var(--text)",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {section.label}
            </a>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes sectionDropdownIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
