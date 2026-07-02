// Articled access gate for the reaction-hosted demo.
//
// The original Articled locked every route to @bmhbusiness.onmicrosoft.com Entra
// accounts. Here it lives behind reaction's OWN session instead: any signed-in
// reaction user may use it, reached via the Launch-demo flow. Same shape as the
// original gate() — returns the identity string to scope data by, or null.
//
// Per the demo decision, history is SHARED across all demo visitors, so every
// signed-in user scopes to the same bucket. (To make it per-user instead, return
// the email here and it would scope naturally.)

import { auth } from "@/auth";

export const ARTICLED_DEMO_USER = "articled-demo";

/** Returns the scoping id for a signed-in reaction user, or null if not signed in. */
export async function articledGate(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  // Shared demo history: everyone scopes to one bucket (true 1:1 with a single firm).
  return ARTICLED_DEMO_USER;
}

/** The signed-in user's real email, for display in the chat header. */
export async function articledViewer(): Promise<{ name: string | null; email: string } | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return { name: session.user?.name ?? null, email };
}
