import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Reaction · University software for student connection",
  description:
    "Reaction — university software connecting students on and off campus. Every action has an equal and opposite reaction.",
  icons: {
    // Updated favicon: blue R to match the new brand colour (was red).
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='80' font-family='Georgia,serif' font-style='italic' fill='%234d6f99'%3ER%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="light" is hard-coded since dark mode is disabled.
    // The previous localStorage-driven theme script is removed (no toggle exists anymore).
    <html lang="en" data-theme="light">
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
      </body>
    </html>
  );
}
