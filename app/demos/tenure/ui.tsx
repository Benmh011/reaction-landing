"use client";

import type { ReactNode } from "react";

/** Section heading with a one-line explanation of what the tab is for. */
export function PageHead({
  title,
  lede,
  aside,
}: {
  title: string;
  lede: string;
  aside?: ReactNode;
}) {
  return (
    <div className="tn-head">
      <div>
        <h2>{title}</h2>
        <p>{lede}</p>
      </div>
      {aside ? <div className="tn-head-aside">{aside}</div> : null}
    </div>
  );
}

export function Figures({ children }: { children: ReactNode }) {
  return <div className="tn-figures">{children}</div>;
}

export function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "alert" | "warn";
}) {
  return (
    <div className={`tn-fig${tone ? ` tn-fig-${tone}` : ""}`}>
      <span className="tn-fig-value">{value}</span>
      <span className="tn-fig-label">{label}</span>
    </div>
  );
}

export function Tag({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "alert" | "warn" | "clear" | "quiet";
}) {
  return (
    <span className={`tn-tag${tone ? ` tn-tag-${tone}` : ""}`}>{children}</span>
  );
}

/** A panel that names the manual process this tab replaces. */
export function Provenance({ children }: { children: ReactNode }) {
  return <p className="tn-prov">{children}</p>;
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="tn-tablewrap">{children}</div>;
}
