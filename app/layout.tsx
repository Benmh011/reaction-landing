import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import SiteAnalytics from "@/components/SiteAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://reaction.org.uk"),
  title: {
    default: "Reaction · University software for student connection",
    template: "%s · Reaction",
  },
  description:
    "University software connecting students on and off campus. Reaction helps universities and students' unions improve engagement, wellbeing, and employability — supporting TEF, Graduate Outcomes, and Access & Participation Plan delivery.",
  applicationName: "Reaction",
  keywords: [
    "university software",
    "student engagement platform",
    "student experience platform",
    "students union software",
    "student wellbeing",
    "student retention",
    "TEF",
    "Graduate Outcomes",
    "Access and Participation Plan",
    "student employability",
  ],
  authors: [{ name: "Reaction" }],
  creator: "Reaction",
  publisher: "Reaction",
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://reaction.org.uk",
    siteName: "Reaction",
    title: "Reaction · University software for student connection",
    description:
      "University software connecting students on and off campus. Every action has an equal and opposite Reaction.",
    // Image auto-attached from app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "Reaction · University software for student connection",
    description: "University software connecting students on and off campus.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://reaction.org.uk",
  },
  // Note: no `icons` field — Next.js auto-detects app/icon.tsx and emits the
  // correct <link rel="icon"> tag. Setting metadata.icons here would override
  // the file convention and reintroduce the data-URI favicon bug.
};

// Organization schema rendered site-wide — describes Reaction as a company.
// Tells Google "this is a real organisation" for the Knowledge Graph.
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Reaction",
  url: "https://reaction.org.uk",
  description: "University software connecting students on and off campus.",
  email: "info@reaction.org.uk",
  founder: {
    "@type": "Person",
    name: "Ben Morgan-Hosey",
  },
  areaServed: {
    "@type": "Country",
    name: "United Kingdom",
  },
  knowsAbout: [
    "Student engagement",
    "Student wellbeing",
    "Student employability",
    "Higher education",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="light" is hard-coded since dark mode is disabled.
    // The previous localStorage-driven theme script is removed (no toggle exists anymore).
    // lang="en-GB" reinforces UK locale signal (matches openGraph locale: en_GB).
    <html lang="en-GB" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Newsreader (display serif), Inter (body sans), JetBrains Mono (mono) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..800;1,6..72,300..800&family=Inter:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        {/* Vercel Analytics — cookieless visitor + page view tracking.
            Data appears in the project's Analytics tab in the Vercel dashboard.
            No personal data collected; no consent banner required. */}
        <Analytics />
        {/* First-party analytics beacon — feeds the in-app /analytics dashboard
            (page views + demo time-on-page). Cookieless; fail-soft. */}
        <SiteAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </body>
    </html>
  );
}
