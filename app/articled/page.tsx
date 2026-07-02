// Articled landing, hosted in reaction. Signed-in users get the practice-management
// dashboard full-screen (served from the gated /articled/demo route); anyone else is
// sent to reaction's sign-in and returned here after.

import { redirect } from "next/navigation";
import { articledGate } from "@/lib/articled/gate";

export const dynamic = "force-dynamic";

export default async function ArticledHome() {
  const user = await articledGate();
  if (!user) redirect("/auth/signin?callbackUrl=/articled");

  return (
    <iframe
      src="/articled/demo"
      title="Articled practice dashboard"
      style={{ border: "none", width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
