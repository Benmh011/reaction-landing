"use client";

import { Analytics } from "@vercel/analytics/next";
import { countingOn } from "@/lib/visitCount";

// Vercel's own cookieless page-view counter (its figures are in the Vercel
// dashboard), behind the same switch as ours: a browser that has counting
// switched off on the Privacy page sends it nothing either.
export default function VercelCount() {
  return <Analytics beforeSend={(event) => (countingOn() ? event : null)} />;
}
