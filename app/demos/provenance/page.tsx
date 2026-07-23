import type { Metadata } from "next";
import { cookies } from "next/headers";
import Gate from "./Gate";
import ProvenanceApp from "./ProvenanceApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Provenance — demonstration",
  description: "A passworded demonstration environment.",
  // A passworded demo must never appear in search results.
  robots: { index: false, follow: false },
};

const COOKIE_NAME = "provenance_demo";
const COOKIE_VALUE = "granted";

export default async function ProvenancePage() {
  const jar = await cookies();
  const granted = jar.get(COOKIE_NAME)?.value === COOKIE_VALUE;
  return granted ? <ProvenanceApp /> : <Gate />;
}
