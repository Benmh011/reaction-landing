import type { Metadata } from "next";
import "./southmoor.css";

export const metadata: Metadata = {
  title: "Clinic Assistant",
};

export default function VetAgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The clinic assistant's own typefaces */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600&display=swap"
      />
      {children}
    </>
  );
}
