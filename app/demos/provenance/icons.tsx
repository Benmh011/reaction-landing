// ————————————————————————————————————————————————————————————————
// Section icons, as South Moor's sidebar has them.
//
// These are Lucide's icons — the set South Moor uses — drawn inline rather
// than installed as a package. Adding a package means changing the site's
// lock file, and a mismatch there fails the whole build; inline, there is
// nothing to install and nothing to fall out of step.
//
// Lucide is ISC licensed (https://lucide.dev). Copyright (c) for portions
// of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT), and
// all other copyright for Lucide is held by Lucide Contributors 2022.
// ————————————————————————————————————————————————————————————————

import type { ReactNode } from "react";

const SHAPES: Record<string, ReactNode> = {
  overview: (
    <><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></>
  ),
  questionnaires: (
    <><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></>
  ),
  documents: (
    <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>
  ),
  personnel: (
    <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>
  ),
  trace: (
    <><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></>
  ),
  stock: (
    <><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" /><path d="m7.5 4.27 9 5.15" /></>
  ),
  coldchain: (
    <><path d="M2 12h10" /><path d="M9 4v16" /><path d="m3 9 3 3-3 3" /><path d="M12 6 9 9 6 6" /><path d="m6 18 3-3 1.5 1.5" /><path d="M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" /></>
  ),
  production: (
    <><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" /></>
  ),
  checks: (
    <><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>
  ),
  procedures: (
    <><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" /></>
  ),
};

export function NavIcon({ id, size = 18 }: { id: string; size?: number }) {
  const shape = SHAPES[id];
  if (!shape) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {shape}
    </svg>
  );
}
