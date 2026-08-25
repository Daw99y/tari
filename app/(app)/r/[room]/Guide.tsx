"use client";

/* THE GUIDE, as a ghost. docs/TARI.md §6: the 1%, made beautiful.
 *
 * One centred column of the cards' text, drifting up forever. The top and
 * bottom dissolve; there is no scrollbar and no end. Click to hold it,
 * click again to let it go. Drag or wheel to read at your own pace. The
 * loop is the content drawn twice and an offset that wraps.
 *
 * Every card is in the loop. The spoiler shield (§6.1) is off for now —
 * nothing is held back; the plumbing stays in lib/guide.ts for the day a
 * reader can ask for it. */

import { useEffect, useRef, useState } from "react";

import { KIND_EYEBROW, type Card } from "@/lib/guide";

import styles from "./room.module.css";

type Props = { cards: Card[] };

const SPEED = 14; // px per second. Slow enough to read, fast enough to notice.

export default function Guide({ cards }: Props) {
  const col = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const height = useRef(0);
  const held = useRef(false);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) held.current = true;
    setHolding(held.current);

    const measure = () => {
      height.current = first.current?.offsetHeight ?? 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (first.current) ro.observe(first.current);

    let last = performance.now();
    let raf = 0;
    const paint = () => {
      const h = height.current;
      if (h > 0) {
        offset.current = ((offset.current % h) + h) % h;
        if (col.current) col.current.style.transform = `translate3d(0, ${-offset.current}px, 0)`;
      }
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!held.current && !drag.current) offset.current += SPEED * dt;
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [cards]);

  const copy = (tag: string) =>
    cards.map((c) => (
      <article key={`${tag}-${c.id}`} className={styles.ghost}>
        <p className={styles.ghostKind} data-kind={c.kind}>
          {KIND_EYEBROW[c.kind]}
        </p>
        <h2 className={styles.ghostSubject}>{c.subject}</h2>
        <p className={styles.ghostTitle}>{c.title}</p>
        <p className={styles.ghostBody}>{c.body}</p>
      </article>
    ));

  return (
    <section className={styles.guide} aria-label="The guide">
      <div
        className={styles.loop}
        data-holding={holding || undefined}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { y: e.clientY, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dy = e.clientY - drag.current.y;
          if (Math.abs(dy) > 2) drag.current.moved = true;
          offset.current -= dy;
          drag.current.y = e.clientY;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          // A press that did not move is a hold, or a release.
          if (d && !d.moved) {
            held.current = !held.current;
            setHolding(held.current);
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onWheel={(e) => {
          offset.current += e.deltaY;
        }}
      >
        <div ref={col} className={styles.column}>
          <div ref={first}>{copy("a")}</div>
          <div aria-hidden="true">{copy("b")}</div>
        </div>
        <div className={styles.veilTop} aria-hidden="true" />
        <div className={styles.veilBottom} aria-hidden="true" />
      </div>

      {holding ? (
        <p className={styles.holdNote} aria-live="polite">
          held
        </p>
      ) : null}
    </section>
  );
}
