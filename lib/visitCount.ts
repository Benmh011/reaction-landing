// What the pieces that count visits share: the anonymous number this browser
// keeps, whether counting is switched on here, and the one way a count is sent.
// Browser only. Everything is best-effort and can never affect the page.
//
// Used by components/SiteAnalytics.tsx, components/VercelCount.tsx,
// components/CountingSwitch.tsx and app/demo/LaunchDemoCard.tsx.
// public/demo-timer.js keeps the same two names (rx_sid, rx_no_count) for the
// demos that are served as pages of their own.

const ID = "rx_sid";
const OFF = "rx_no_count";

/** The anonymous number this browser keeps for this site. Not a cookie; never sent anywhere else. */
export function visitorId(): string {
  try {
    let sid = localStorage.getItem(ID);
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)) + Date.now().toString(36);
      localStorage.setItem(ID, sid);
    }
    return sid;
  } catch {
    return "anon-" + Date.now().toString(36);
  }
}

/** Is counting on in this browser? It is, unless it has been switched off on the Privacy page. */
export function countingOn(): boolean {
  try {
    return localStorage.getItem(OFF) !== "1";
  } catch {
    return true;
  }
}

/** Switch counting off or on for this browser. Off also forgets the number it kept. */
export function setCounting(on: boolean): void {
  try {
    if (on) localStorage.removeItem(OFF);
    else {
      localStorage.setItem(OFF, "1");
      localStorage.removeItem(ID);
    }
  } catch {
    /* a browser that will not store anything keeps nothing to switch */
  }
}

/** Send one count. `leaving` uses the browser's own send-as-the-page-closes, which survives the page going away. */
export function sendCount(payload: Record<string, unknown>, leaving = false): void {
  if (!countingOn()) return;
  try {
    const body = JSON.stringify({ ...payload, sessionId: visitorId() });
    if (leaving && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* counting must never get in the way */
  }
}
