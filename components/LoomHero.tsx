"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { loomWeaveSvg } from "./loomWeave";

/**
 * The Loom — homepage hero.
 *
 * Sixty-four threads drift loose on the left and braid tight on the right:
 * intelligence, in formation. The headline resolves the same pun in motion —
 * it fades in reading "Intelligence, information." on one line, holds a beat,
 * then "formation." breaks off, dips below the baseline and glides into the
 * second line. The letters are filled with a micro-weave of the thread
 * colours (background-clip:text per segment); during the flight each
 * segment's background is counter-shifted so the weave stays fixed in
 * headline space and the threads stream through the moving word.
 *
 * The coloured tittles are the typeface's own: a real "i" (Schibsted 500)
 * rendered on an overlay layer above the thread field, clipped so only its
 * dot survives, with the dotless ı beneath carrying the stroke. Size and
 * position are the font designer's, not ours.
 *
 * No-JS / reduced-motion / narrow screens: the headline simply fades in
 * already resolved — the flight needs JS measurement, so the server-rendered
 * state IS the final state and the script only rewinds it on hydration.
 */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ez = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Dotless ı for the textured layer — the stroke only. */
function TiPlain() {
  return <span className="ti">ı</span>;
}

/** Overlay ı whose real-i underlay is clipped to just its coloured tittle. */
function TiDot({ c }: { c: "verm" | "blue" | "green" }) {
  return (
    <span className="ti">
      <span className={`u ${c}`}>i</span>ı
    </span>
  );
}

export default function LoomHero({
  loggedIn,
  email,
}: {
  loggedIn: boolean;
  email: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const h1 = root.querySelector<HTMLElement>(".loom-h1");
    const sb = h1?.querySelector<HTMLElement>(".sb");
    if (!h1 || !sb) return;
    const scs = Array.from(root.querySelectorAll<HTMLElement>(".loom-h1 .sc, .loom-h1c .sc"));
    const scTex = h1.querySelector<HTMLElement>(".sc");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 700px)").matches;

    const lineHeight = () => parseFloat(getComputedStyle(h1).fontSize); // line-height: 1

    /** Static texture alignment so the weave reads as one continuous cloth. */
    const alignRest = () => {
      const h1r = h1.getBoundingClientRect();
      const sbr = sb.getBoundingClientRect();
      sb.style.backgroundPosition = `${-(sbr.left - h1r.left)}px 0px`;
      if (scTex) scTex.style.backgroundPosition = `0px ${-lineHeight()}px`;
    };

    if (reduce || narrow) {
      alignRest();
      window.addEventListener("resize", alignRest);
      return () => window.removeEventListener("resize", alignRest);
    }

    /** One frame of the timeline. t in seconds from first paint-ish. */
    const pose = (t: number) => {
      const q = clamp01((t - 1.5) / 0.95);
      const py = ez(clamp01(q / 0.55)); // drop first
      const px = ez(clamp01((q - 0.25) / 0.75)); // then slide left
      const h1r = h1.getBoundingClientRect();
      const sbr = sb.getBoundingClientRect();
      const lh = lineHeight();
      const dx = sbr.right - h1r.left;
      const tx = dx * (1 - px);
      const ty = -lh * (1 - py);
      for (const s of scs) s.style.transform = `translate(${tx}px, ${ty}px)`;
      sb.style.backgroundPosition = `${-(sbr.left - h1r.left)}px 0px`;
      if (scTex) scTex.style.backgroundPosition = `${-tx}px ${-(lh + ty)}px`;
      return q >= 1;
    };

    let raf = 0;
    let startAt: number | null = null;
    let done = false;
    const onResize = () => {
      if (done) alignRest();
    };
    window.addEventListener("resize", onResize);

    document.fonts.ready.then(() => {
      const step = (now: number) => {
        if (startAt == null) startAt = now - 200; // hydration ≈ 0.2s into the CSS fade
        done = pose((now - startAt) / 1000);
        if (!done) {
          raf = requestAnimationFrame(step);
        } else {
          for (const s of scs) s.style.transform = "";
          alignRest();
        }
      };
      raf = requestAnimationFrame(step);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section className="loom-hero" id="top" ref={ref}>
      <div className="loom-weave" aria-hidden="true" dangerouslySetInnerHTML={{ __html: loomWeaveSvg }} />

      <div className="loom-body">
        <div className="loom-h1w">
          <h1 className="loom-h1" aria-label="Intelligence, in formation.">
            <span className="sa">
              Intell
              <TiPlain />
              gence,
            </span>{" "}
            <span className="sb">
              <TiPlain />n
            </span>
            <br />
            <span className="sc">
              format
              <TiPlain />
              on<span className="stop">.</span>
            </span>
          </h1>
          <div className="loom-h1c" aria-hidden="true">
            <span className="sa">
              Intell
              <TiDot c="verm" />
              gence,
            </span>{" "}
            <span className="sb">
              <TiDot c="blue" />n
            </span>
            <br />
            <span className="sc">
              format
              <TiDot c="green" />
              on<span className="stop">.</span>
            </span>
          </div>
        </div>

        <div className="loom-ctas">
          {loggedIn ? (
            <Link href="/demo" className="btn btn-large btn-loom-verm">
              Launch demo
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ) : (
            <Link href="/demo" className="btn btn-large btn-loom-verm">
              Book a demo
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
          )}
          <Link href="/products" className="btn btn-large btn-loom-ghost">
            See the work
          </Link>
        </div>

        <div className="loom-signin mono">
          {loggedIn ? (
            <>
              Signed in as {email}.{" "}
              <Link href="/auth/signout">Sign out</Link>
            </>
          ) : (
            <>
              Already have an account? <Link href="/auth/signin">Sign in</Link>
            </>
          )}
        </div>
      </div>

      <div className="loom-strip mono">
        <span>In practice — veterinary · food production · property · accountancy · seafood · trades</span>
        <span>Reaction App Ltd · England no. 17011311</span>
      </div>
    </section>
  );
}
