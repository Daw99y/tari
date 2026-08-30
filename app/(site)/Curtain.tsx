"use client";

/* The wait, given something to look at.
 *
 * The hero is a 3072-pixel photograph and a character assembled out of a body
 * and ten pieces of gear, and until both have arrived the top of the page is
 * a dark rectangle with a title floating in it. This holds a curtain over
 * that until they land.
 *
 * The curtain is not a spinner with a brand on it. It is a succubus doing
 * what a succubus does, and the read-out under her names the actual step the
 * page is on — the hall, then the rogue — so the line is a progress
 * indicator rather than a mood. When the last step lands she plays
 * SuccubusEntice and the curtain lifts on her final frame.
 *
 * Two rules it must never break. It cannot outlast the page: a hard cap
 * lifts it whether or not anything reported in. And it cannot be the reason
 * a reader waits: if the hero was already cached and arrived before she did,
 * the curtain leaves at once and skips the performance. */

import { useCallback, useEffect, useRef, useState } from "react";

import Succubus from "@/components/Succubus";
import FoxMark from "@/components/FoxMark";

import styles from "./curtain.module.css";

/** The steps, in the order they finish. `hall` is the photograph, `rogue` is
 *  the assembled figure. The read-out names whichever is still outstanding. */
const STEPS = [
  ["hall", "Lighting the hall"],
  ["rogue", "Dressing the rogue"],
] as const;

/** However badly the network is going, the reader gets the page. */
const CAP_MS = 12_000;

type Phase = "waiting" | "leaving" | "gone";

export default function Curtain({
  done,
  ready,
  onLifting,
}: {
  done: boolean;
  ready: boolean[];
  /** Fired the moment the curtain starts to leave. The hero's push-in waits
   *  on this: it is a sixty-second move, and started at page load it is
   *  already four seconds through by the time anybody can see the room. */
  onLifting?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("waiting");
  /** She only performs if she was on stage in time to. */
  const [onStage, setOnStage] = useState(false);
  const stage = useRef(false);
  stage.current = onStage;

  const leave = useCallback(() => {
    setPhase((p) => (p === "waiting" ? "leaving" : p));
  }, []);

  /* Announced from an effect, not from inside the state updater. React may
   * run an updater during a render pass, and telling the parent to set state
   * there is the "cannot update a component while rendering a different one"
   * warning — and, worse, a render the parent did not ask for. */
  useEffect(() => {
    if (phase === "leaving") onLifting?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on the
    // one transition into `leaving`, not whenever the callback changes.
  }, [phase]);

  /* The page arrived. If she is standing there, hand her the cue and wait for
   * the entice; if she is not, do not make the reader wait for her. */
  useEffect(() => {
    if (!done) return;
    if (!stage.current) leave();
  }, [done, leave]);

  useEffect(() => {
    const cap = setTimeout(leave, CAP_MS);
    return () => clearTimeout(cap);
  }, [leave]);

  /* The curtain owns the scroll while it is up: the page under it is a hero
   * the reader cannot see yet, and a scroll made now lands them halfway down
   * a section they never saw the top of.
   *
   * Holding the gutter is the other half of that, and skipping it was a
   * visible bug. This site draws its own 10px scrollbar (globals.css), so it
   * is a classic one that takes layout width rather than an overlay that
   * floats above it. Hiding the overflow took that 10px away, every element
   * in flow got 10px wider, and the hero photograph — object-fit: cover, so
   * a width change re-crops it — slid sideways at the exact moment the
   * curtain lifted. The reader sees the room jump as it is handed to them.
   *
   * So the width the scrollbar was holding is given back as padding for
   * exactly as long as the scrollbar is gone. Both changes land in the same
   * style flush, so the content box never actually changes size and there is
   * nothing to re-crop. Measured rather than assumed: a machine with overlay
   * scrollbars reports a gap of zero and gets no padding, which is correct —
   * there was never any width to give back. */
  useEffect(() => {
    if (phase === "gone") return;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const style = document.body.style;
    const prevOverflow = style.overflow;
    const prevPadding = style.paddingRight;
    style.overflow = "hidden";
    if (gap > 0) style.paddingRight = `${gap}px`;
    return () => {
      style.overflow = prevOverflow;
      style.paddingRight = prevPadding;
    };
  }, [phase]);

  if (phase === "gone") return null;

  const step = STEPS.find((_, i) => !ready[i]) ?? null;

  return (
    <div
      className={styles.curtain}
      data-phase={phase}
      role="status"
      aria-live="polite"
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && phase === "leaving") setPhase("gone");
      }}
    >
      {/* Held where the page's own header will be, so the curtain lifting
          reads as a room opening rather than a screen being replaced. */}
      <span className={styles.mark} aria-hidden="true">
        <FoxMark className={styles.fox} />
      </span>

      <Succubus
        className={styles.figure}
        entice={done}
        onReady={() => setOnStage(true)}
        onFinished={leave}
      />

      <p className={styles.readout}>{step ? step[1] : "Walk in"}</p>
    </div>
  );
}
