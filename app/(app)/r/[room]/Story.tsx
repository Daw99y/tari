"use client";

/* THE STORY, drifting past. No drawn road, no marks, no second photograph
 * — the room's own art already stands behind everything (Room.tsx), and
 * the guide walks across it: an endless band of encounter cards, ordered
 * west to east by their `t`, looping forever the way a patrol does.
 *
 * The band drifts on its own, slowly. A hand on it takes over — drag it,
 * wheel it, arrow it — and a lifted hand gives it back. The loop is two
 * copies of the sequence and a modulo; nothing is ever unmounted.
 *
 * The spoiler shield (docs/TARI.md §6.1) is a veil on the words alone:
 * the card rides past like any other, its lines blurred until "Read it"
 * is pressed. Stitches carries his zone-wide yell typed in raid red,
 * cycling — any card given a `yell` gets the same. "Open the map here"
 * stays the only door: the telling draws no map. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDock } from "@/components/Dock";
import { KIND_EYEBROW, type Card, type GuideFile, type Rare } from "@/lib/guide";
import type { ZonePlate } from "@/lib/plate";

import styles from "./story.module.css";

const DRIFT = 14; // px/s, the band's own pace
const IDLE = 2600; // ms after the hand lifts before the drift resumes

type Stop =
  | { key: string; card: Card; rare?: undefined }
  | { key: string; card?: undefined; rare: Rare & { lvl?: number; mapAt: { x: number; y: number } | null } };

/* The zone-wide monster yell, typed in raid red, letter by letter, on a
 * cycle — the band never stops, and neither does he. */
function Yell({ who, text }: { who: string; text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      return;
    }
    const timer = window.setInterval(() => {
      setN((v) => (v >= text.length + 40 ? 0 : v + 1));
    }, 70);
    return () => window.clearInterval(timer);
  }, [text]);
  return (
    <span className={styles.yell}>
      <span className={styles.yellWho}>{who} yells</span>
      <span className={styles.yellText}>{text.slice(0, Math.min(n, text.length))}</span>
    </span>
  );
}

export default function Story({
  file,
  plate,
  roomId,
  room,
}: {
  file: GuideFile;
  plate: ZonePlate;
  roomId: string;
  room: string;
}) {
  const dock = useDock();
  const [read, setRead] = useState<Record<string, true>>({});

  const title = file.cards.find((c) => c.form === "title");

  /* One sequence, west to east: encounter cards and rares merged on `t`. */
  const stops = useMemo<Stop[]>(() => {
    const spots = new Map(plate.pins.filter((p) => p.kind === "rare").map((p) => [p.name, p]));
    const out: Stop[] = [];
    for (const c of file.cards) {
      if (c.form === "title" || c.form === "six") continue;
      out.push({ key: c.id, card: c });
    }
    for (const r of file.rares ?? []) {
      const pin = spots.get(r.name);
      out.push({
        key: `rare-${r.name}`,
        rare: { ...r, lvl: pin?.lvl[0], mapAt: pin ? { x: pin.x, y: pin.y } : null },
      });
    }
    const t = (s: Stop) => s.card?.t ?? s.rare?.t ?? 0;
    out.sort((a, b) => t(a) - t(b));
    return out;
  }, [file, plate.pins]);

  /* ---- the band: one transform, one loop, two copies ---- */
  const band = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const state = useRef({
    x: 0,
    vel: 0,
    half: 0,
    dragging: false,
    hover: false,
    still: false,
    lastHand: 0,
    grabX: 0,
    grabPos: 0,
    moved: 0,
    lastMoveX: 0,
    lastMoveT: 0,
  });

  useEffect(() => {
    const s = state.current;
    const el = track.current;
    if (!el) return;
    s.still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const measure = () => {
      s.half = el.scrollWidth / 2;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      if (!s.dragging) {
        if (Math.abs(s.vel) > 4) {
          /* the throw, dying out */
          s.x += s.vel * dt;
          s.vel *= Math.exp(-3.2 * dt);
        } else if (!s.still && !s.hover && now - s.lastHand > IDLE) {
          s.x -= DRIFT * dt;
        }
      }
      if (s.half > 0) {
        while (s.x <= -s.half) s.x += s.half;
        while (s.x > 0) s.x -= s.half;
      }
      el.style.transform = `translate3d(${s.x}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [stops]);

  const hand = useCallback((dx: number) => {
    const s = state.current;
    s.x += dx;
    s.vel = 0;
    s.lastHand = performance.now();
  }, []);

  useEffect(() => {
    const el = band.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (d === 0) return;
      e.preventDefault();
      hand(-d);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [hand]);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") hand(-320);
      else if (e.key === "ArrowLeft") hand(320);
    },
    [hand]
  );

  const door = (spot: { x: number; y: number } | [number, number] | null | undefined) => {
    if (!spot || !dock) return null;
    const s = Array.isArray(spot) ? { x: spot[0], y: spot[1] } : spot;
    return (
      <button type="button" className={styles.act} onClick={() => dock.openMapAt(s)}>
        Open the map here
      </button>
    );
  };

  /* One pass of the sequence. Mounted twice; the copy is hidden from the
   * tree readers walk. */
  const pass = (ghost: boolean) => (
    <div className={styles.pass} aria-hidden={ghost || undefined}>
      {stops.map((stop, i) =>
        stop.card ? (
          <article
            key={stop.key}
            className={styles.card}
            data-lift={i % 3}
            data-kind={stop.card.kind}
          >
            {stop.card.icon ? (
              <span className={styles.tile}>
                <img src={`/story/${roomId}/${stop.card.icon}.png`} alt="" draggable={false} />
              </span>
            ) : null}
            <span className={styles.text}>
              <span className={styles.eyebrow} data-kind={stop.card.kind}>
                {KIND_EYEBROW[stop.card.kind]}
              </span>
              <span className={styles.name}>{stop.card.subject}</span>
              <span className={styles.tag}>{stop.card.tag}</span>
              {stop.card.yell && !ghost ? <Yell who={stop.card.subject} text={stop.card.yell} /> : null}
              <span
                className={styles.lines}
                data-shroud={(stop.card.spoiler && !read[stop.key]) || undefined}
              >
                {(stop.card.pages ? stop.card.pages.flat() : stop.card.lines).map((l) => (
                  <span key={l} className={styles.line}>
                    {l}
                  </span>
                ))}
              </span>
              <span className={styles.acts}>
                {stop.card.spoiler && !read[stop.key] ? (
                  <button
                    type="button"
                    className={styles.act}
                    tabIndex={ghost ? -1 : undefined}
                    onClick={() => setRead((was) => ({ ...was, [stop.key]: true }))}
                  >
                    Read it — it gives away an ending
                  </button>
                ) : (
                  door(stop.card.at)
                )}
              </span>
            </span>
          </article>
        ) : (
          <article key={stop.key} className={styles.rare} data-lift={i % 3}>
            <span className={styles.diamond} aria-hidden="true">
              <svg viewBox="0 0 12 12">
                <path d="M6 1 11 6 6 11 1 6Z" />
              </svg>
            </span>
            <span className={styles.text}>
              <span className={styles.eyebrow} data-kind="beware">
                Rare{stop.rare.lvl ? ` · level ${stop.rare.lvl}` : ""}
              </span>
              <span className={styles.name}>{stop.rare.name}</span>
              <span className={styles.lines}>
                {stop.rare.lines.map((l) => (
                  <span key={l} className={styles.line}>
                    {l}
                  </span>
                ))}
              </span>
              <span className={styles.acts}>{door(stop.rare.mapAt)}</span>
            </span>
          </article>
        )
      )}
    </div>
  );

  return (
    <section className={styles.story} data-story="" aria-label={`The story of ${room}`}>
      {title ? (
        <header className={styles.head}>
          <span className={styles.eyebrow} data-kind={title.kind}>
            {KIND_EYEBROW[title.kind]}
          </span>
          <h2 className={styles.wasWord}>
            {title.subject}
            <span className={styles.strike} aria-hidden="true" />
          </h2>
          <p className={styles.headLines}>{title.lines.join(" ")}</p>
        </header>
      ) : null}

      <div
        ref={band}
        className={styles.band}
        role="group"
        aria-label="The encounters, west to east. Drag, scroll or arrow through them; they loop."
        tabIndex={0}
        onKeyDown={onKey}
        onPointerEnter={() => (state.current.hover = true)}
        onPointerLeave={() => (state.current.hover = false)}
        onPointerDown={(e) => {
          const s = state.current;
          s.dragging = true;
          s.grabX = e.clientX;
          s.grabPos = s.x;
          s.moved = 0;
          s.lastMoveX = e.clientX;
          s.lastMoveT = performance.now();
          s.vel = 0;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const s = state.current;
          if (!s.dragging) return;
          const now = performance.now();
          s.x = s.grabPos + (e.clientX - s.grabX);
          s.moved = Math.max(s.moved, Math.abs(e.clientX - s.grabX));
          const dt = now - s.lastMoveT;
          if (dt > 0) s.vel = ((e.clientX - s.lastMoveX) / dt) * 1000;
          s.lastMoveX = e.clientX;
          s.lastMoveT = now;
          s.lastHand = now;
        }}
        onPointerUp={() => {
          const s = state.current;
          s.dragging = false;
          s.lastHand = performance.now();
        }}
        onPointerCancel={() => {
          state.current.dragging = false;
        }}
        onClickCapture={(e) => {
          /* a drag is not a press */
          if (state.current.moved > 6) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div ref={track} className={styles.track}>
          {pass(false)}
          {pass(true)}
        </div>
      </div>
    </section>
  );
}
