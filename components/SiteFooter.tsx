export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="container foot-inner">
        <div>
          <span className="foot-mark">Reaction</span>
          <span
            style={{
              marginLeft: 14,
              fontFamily: "'Geist Mono', monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            © 2026
          </span>
        </div>
        <div className="foot-links">
          <a href="mailto:info@reaction.org.uk">Contact</a>
          <a href="/">Home</a>
        </div>
      </div>
    </footer>
  );
}
