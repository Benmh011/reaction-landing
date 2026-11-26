"use client";

import { useEffect, useState } from "react";
import { countingOn, setCounting } from "@/lib/visitCount";

// The switch on the Privacy page: counting on or off for this browser.
// Off is remembered in this browser only, and forgets the number it kept.
export default function CountingSwitch() {
  // Not known until the page is in the browser: the setting lives there.
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => setOn(countingOn()), []);

  const flip = () => {
    const next = !on;
    setCounting(next);
    setOn(next);
  };

  return (
    <div className="panel panel-tight" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 260px" }}>
        <div style={{ fontWeight: 600, color: "var(--text)" }} aria-live="polite" data-counting={on === null ? "" : on ? "on" : "off"}>
          {on === null ? "Counting in this browser" : on ? "Visits from this browser are being counted." : "Visits from this browser are not counted."}
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", margin: "6px 0 0", lineHeight: 1.55 }}>
          {on === false
            ? "The number this browser kept has been deleted. Nothing more is recorded from it unless you switch counting back on."
            : "Switching it off stops it at once and deletes the number this browser keeps. It applies to this browser only."}
        </p>
      </div>
      <button type="button" className={on === false ? "btn btn-primary" : "btn btn-ghost"} onClick={flip} disabled={on === null} data-no-track>
        {on === false ? "Switch counting on" : "Switch counting off"}
      </button>
    </div>
  );
}
