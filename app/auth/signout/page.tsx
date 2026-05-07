"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SignOutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return (
    <div style={{ padding: 80, textAlign: "center", color: "var(--text-soft)" }}>
      Signing out…
    </div>
  );
}
