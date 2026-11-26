// Time spent in a demo that is served as a page of its own (Trades PMS, the
// Articled dashboard), where the site's own counter is not on the page.
// Added to those pages by the routes that serve them:
//   <script src="/demo-timer.js" data-slug="trades-pms" defer></script>
// It sends the time when the tab is hidden or the page goes, and starts the
// clock again when the tab comes back. It sends nothing from a browser that
// has counting switched off (the Privacy page), and can never affect the demo.
(function () {
  try {
    var slug = (document.currentScript && document.currentScript.getAttribute("data-slug")) || "";
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(slug)) return;
    var started = Date.now();

    function countingOn() {
      try { return localStorage.getItem("rx_no_count") !== "1"; } catch (e) { return true; }
    }
    function visitorId() {
      try {
        var sid = localStorage.getItem("rx_sid");
        if (!sid) {
          sid = ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2)) + Date.now().toString(36);
          localStorage.setItem("rx_sid", sid);
        }
        return sid;
      } catch (e) { return "anon-" + Date.now().toString(36); }
    }
    function flush() {
      if (!started) return;
      var ms = Math.min(Date.now() - started, 1000 * 60 * 60 * 6);
      started = 0;
      if (ms < 1000 || !countingOn()) return;
      try {
        var body = JSON.stringify({ type: "demo", slug: slug, durationMs: ms, sessionId: visitorId() });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
        else fetch("/api/track", { method: "POST", body: body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(function () {});
      } catch (e) { /* counting must never get in the way */ }
    }
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flush();
      else if (!started) started = Date.now();
    });
    window.addEventListener("pagehide", flush);
  } catch (e) { /* counting must never get in the way */ }
})();
