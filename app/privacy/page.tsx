// app/privacy/page.tsx
//
// How this site counts visits, in plain words, with the switch that turns it
// off for the browser reading it. It describes components/SiteAnalytics.tsx,
// app/api/track/route.ts and Vercel's own counter exactly: if what they record
// changes, this page changes with them.

import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import CountingSwitch from "@/components/CountingSwitch";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How reaction.org.uk counts visits, what it keeps, and how to switch it off.",
  alternates: { canonical: "https://reaction.org.uk/privacy" },
};

const h2: React.CSSProperties = {
  fontFamily: "'Newsreader', Georgia, serif",
  fontStyle: "italic",
  fontWeight: 600,
  fontSize: "1.35rem",
  letterSpacing: "-0.01em",
  margin: "36px 0 10px",
  color: "var(--text)",
};
const p: React.CSSProperties = { fontSize: "0.98rem", lineHeight: 1.65, color: "var(--text-soft)", margin: "0 0 12px" };
const li: React.CSSProperties = { ...p, margin: "0 0 6px" };

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />

      <section style={{ padding: "60px 0 80px" }}>
        <div className="container-narrow">
          <div className="page-eyebrow">Privacy</div>
          <h1 className="page-title">
            How this site <em>counts visits</em>.
          </h1>
          <p className="page-lede">
            We count visits to see which pages are used and to make the site better. It is done without
            cookies and without knowing who you are, and you can switch it off.
          </p>

          <CountingSwitch />

          <h2 style={h2}>What is kept</h2>
          <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
            <li style={li}>Each page opened: which page, when, and the site you came from, if there was one.</li>
            <li style={li}>Your country, worked out as the page is served. Your IP address is not kept.</li>
            <li style={li}>Whether the screen was the size of a phone, a tablet or a desktop.</li>
            <li style={li}>
              A random number kept in this browser, so that two pages opened from the same browser count as
              one visitor. It is not a cookie, it says nothing about you, and it is used on this site only.
            </li>
            <li style={li}>Which buttons and contact links are pressed, and how long a demo is open.</li>
            <li style={li}>
              If you arrive from a link in one of our emails, which mailing the link was in. It does not say
              which person the email went to.
            </li>
          </ul>

          <h2 style={h2}>What is not</h2>
          <p style={p}>
            No name, no email address and no IP address is kept by the counting. The figures are used by
            Reaction only, as totals, to improve this site. They are not sold, shared or used for advertising.
          </p>
          <p style={p}>
            Our host, Vercel, keeps its own count of page views, also without cookies. The switch above stops
            that as well.
          </p>
          <p style={p}>
            If you fill in a form here, what you send is kept so that we can reply. That is separate from the
            counting described on this page.
          </p>

          <h2 style={h2}>Questions</h2>
          <p style={p}>
            Write to <a href="mailto:info@reaction.org.uk">info@reaction.org.uk</a>. Reaction is Reaction App Ltd.
          </p>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
