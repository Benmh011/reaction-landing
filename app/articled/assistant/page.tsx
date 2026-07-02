// The live Articled assistant, hosted inside reaction and gated by reaction's own
// session. Signed-in users get the chat; anyone else is sent to reaction's sign-in.
// Sign-out returns to the Articled dashboard landing.

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { articledViewer } from "@/lib/articled/gate";
import Chat from "../Chat";

export const dynamic = "force-dynamic";

export default async function ArticledAssistantPage() {
  const viewer = await articledViewer();
  if (!viewer) redirect("/auth/signin?callbackUrl=/articled/assistant");

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/articled" });
  }

  return <Chat user={viewer} signOutAction={doSignOut} />;
}
