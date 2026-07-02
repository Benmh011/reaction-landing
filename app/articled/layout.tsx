// Articled runs as a hosted module inside reaction with its OWN visual system
// (Spectral / Hanken Grotesk / IBM Plex Mono, ink-and-paper + brass). This layout
// scopes Articled's stylesheet to the /articled subtree so it doesn't touch the
// reaction landing styles.
import "./articled.css";

export const metadata = {
  title: "Articled — practice assistant",
};

export default function ArticledLayout({ children }: { children: React.ReactNode }) {
  return <div className="articled-root">{children}</div>;
}
