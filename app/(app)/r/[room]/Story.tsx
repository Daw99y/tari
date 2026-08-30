"use client";

/* THE STORY, one card at a time. The guide is a deck now: a single card
 * stands still on the room's art, and the rest of the zone waits visibly
 * behind it — two sleeves of the deck peeking out from under the top
 * card, and a rail of the encounters' own client icons underneath, every
 * one of them a door. Nobody has to guess that there is more; the deck
 * says so the way a stack of cards on a table does.
 *
 * The road still orders the deck west to east, and the two words that
 * turn it are the road's own ends — "Raven Hill" back, "Darkshire" on.
 * Arrow keys and a swipe do the same. The card you were on is remembered
 * per room.
 *
 * The spoiler shield (docs/TARI.md §6.1) is a veil on the words alone:
 * "Read it" lifts it. A card with a `yell` types it in raid red, on a
 * cycle — Stitches today. "Open the map here" stays the only door: the
 * telling draws no map. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDock } from "@/components/Dock";
import { KIND_EYEBROW, type Card, type GuideFile, type Rare } from "@/lib/guide";
import type { ZonePlate } from "@/lib/plate";

import styles from "./story.module.css";

const KEY = (room: string) => `tari:story:${room}`;

type Stop =
  | { key: string; card: Card; rare?: undefined }
  | { key: string; card?: undefined; rare: Rare & { lvl?: number; mapAt: { x: number; y: number } | null } };

/* The zone-wide monster yell, typed in raid red, letter by letter, on a
 * cycle. */
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
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [read, setRead] = useState<Record<string, true>>({});
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const title = file.cards.find((c) => c.form === "title");
  const [west, east] = file.roadEnds ?? ["Back", "On"];

  /* One deck, west to east: encounter cards and rares merged on `t`. */
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

  /* Restore the card the reader was on. */
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(KEY(roomId)));
      if (Number.isInteger(saved) && saved > 0 && saved < stops.length) setAt(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY(roomId), String(at));
    } catch {}
  }, [at, roomId]);

  const go = useCallback(
    (next: number, d?: 1 | -1) => {
      const n = ((next % stops.length) + stops.length) % stops.length;
      setDir(d ?? (n > at || (at === stops.length - 1 && n === 0) ? 1 : -1));
      setAt(n);
    },
    [at, stops.length]
  );

  const stop = stops[at];

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") go(at + 1, 1);
      else if (e.key === "ArrowLeft") go(at - 1, -1);
    },
    [at, go]
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

  if (stops.length === 0) return null;

  return (
    <section
      className={styles.story}
      data-story=""
      data-deck=""
      aria-label={`The story of ${room}`}
      onKeyDown={onKey}
    >
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

      <div className={styles.table}>
        {/* The deck: the rest of the zone, visibly waiting. */}
        <div className={styles.deck} aria-hidden="true">
          <span className={styles.sleeve} data-under="2" />
          <span className={styles.sleeve} data-under="1" />
        </div>

        <div
          className={styles.slot}
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s || e.pointerType === "mouse") return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - s.y))
              go(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
          }}
        >
          <article key={stop.key} className={styles.card} data-dir={dir}>
            {stop.card ? (
              <>
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
                  {stop.card.yell ? <Yell who={stop.card.subject} text={stop.card.yell} /> : null}
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
                        onClick={() => setRead((was) => ({ ...was, [stop.key]: true }))}
                      >
                        Read it — it gives away an ending
                      </button>
                    ) : (
                      door(stop.card.at)
                    )}
                  </span>
                </span>
              </>
            ) : (
              <>
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
              </>
            )}
          </article>
        </div>

        {/* The two ends of the road turn the deck. */}
        <nav className={styles.turns} aria-label="Turn the deck">
          <button type="button" className={styles.turn} onClick={() => go(at - 1, -1)}>
            <span className={styles.turnGlyph} aria-hidden="true">
              ←
            </span>
            {west}
          </button>
          <span className={styles.count}>
            {at + 1} <span className={styles.countOf}>of {stops.length}</span>
          </span>
          <button type="button" className={styles.turn} data-east="" onClick={() => go(at + 1, 1)}>
            {east}
            <span className={styles.turnGlyph} aria-hidden="true">
              →
            </span>
          </button>
        </nav>
      </div>

      {/* The rail: every card in the deck, wearing its own icon. */}
      <div className={styles.rail} role="tablist" aria-label="Every encounter, west to east">
        {stops.map((s, i) => {
          const name = s.card ? s.card.subject : s.rare.name;
          const icon = s.card?.icon ?? s.rare?.icon;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === at}
              aria-label={name}
              title={name}
              className={s.rare ? styles.railRare : styles.railStop}
              data-live={i === at || undefined}
              data-kind={s.card?.kind}
              onClick={() => go(i)}
            >
              {s.rare ? (
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M6 1 11 6 6 11 1 6Z" />
                </svg>
              ) : icon ? (
                <img src={`/story/${roomId}/${icon}.png`} alt="" draggable={false} />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
