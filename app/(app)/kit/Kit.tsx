"use client";

/* THE KIT, dealt. docs/WELCOME.md §1.
 *
 * The same deck the telling is (Story.tsx): one card standing still, two
 * sleeves waiting behind it, a rail of every card underneath, and two words
 * that turn it. It imports story.module.css rather than restating any of that
 * — one grammar, three uses. When a fourth arrives, the shared rules want
 * lifting into a `.deck` the way `.drawer` and `.rooms` want a `.panel`.
 *
 * NOTHING IS TICKED. No progress bar, no "3 of 11" as an achievement — the
 * count under the card is the deck's own position, the same one the telling
 * draws, and it does not persist as a score. A reader who leaves on card two
 * and comes back next month lands on card two, which is a bookmark, not a
 * streak (docs/TARI.md §4.2).
 *
 * THE LAST CARD IS A DOOR. It ends in front of the composer in the reader's
 * own starting zone, because the first thing you do in Tari should be for
 * somebody else (docs/WELCOME.md §2.3). With no character yet the door still
 * opens — on Elwynn, the game's own first room — rather than asking the
 * reader to make one before they may leave a pin. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { PinFace } from "@/components/PinChip";
import { loadCharacter, START_ROOM } from "@/lib/character";
import type { KitCard } from "@/lib/kit";

import styles from "./kit.module.css";
import deck from "../r/[room]/story.module.css";

const KEY = "tari:kit";

/** Where the door goes when nobody has made a character yet. */
const FIRST_ROOM = "elwynn-forest";

export default function Kit({ cards }: { cards: KitCard[] }) {
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [room, setRoom] = useState(FIRST_ROOM);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  /* The reader's own starting zone, when there is a reader. Client-side
     because the roster lives in this browser (lib/character.ts). */
  useEffect(() => {
    const who = loadCharacter();
    const start = who ? START_ROOM[who.race] : undefined;
    if (start) setRoom(start);
  }, []);

  /* The card you were on. A bookmark, not a score. */
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (Number.isInteger(saved) && saved > 0 && saved < cards.length) setAt(saved);
    } catch {}
  }, [cards.length]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(at));
    } catch {}
  }, [at]);

  const go = useCallback(
    (next: number, d?: 1 | -1) => {
      const n = ((next % cards.length) + cards.length) % cards.length;
      setDir(d ?? (n > at || (at === cards.length - 1 && n === 0) ? 1 : -1));
      setAt(n);
    },
    [at, cards.length]
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(at + 1, 1);
    if (e.key === "ArrowLeft") go(at - 1, -1);
  };

  if (cards.length === 0) return null;
  const card = cards[Math.min(at, cards.length - 1)];

  return (
    <section className={styles.kit} tabIndex={-1} onKeyDown={onKey} aria-label="The kit">
      {/* Placeholder until the kit has art of its own. */}
      <img className={styles.art} src="/RLextras/wishlist.webp" alt="" decoding="async" />
      <div className={styles.scrim} aria-hidden="true" />

      <header className={styles.head}>
        <span className={styles.eyebrow}>What to carry</span>
        <h1 className={styles.h1}>You will be here a while.</h1>
        <p className={styles.lede}>
          Nothing in here is required and none of it is a task. It is what somebody who has
          played this before would tell you to put in your bags.
        </p>
      </header>

      <div className={styles.stage}>
        <div className={`${deck.table} ${styles.table}`}>
          <div className={deck.deck} aria-hidden="true">
            <span className={deck.sleeve} data-under="2" />
            <span className={deck.sleeve} data-under="1" />
          </div>

          <div
            className={`${deck.slot} ${styles.slot}`}
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
            <article key={card.id} className={`${deck.card} ${styles.card}`} data-dir={dir}>
              {card.icon ? (
                <span className={deck.tile}>
                  <img src={card.icon.startsWith("/") ? card.icon : `/kit/${card.icon}`} alt="" draggable={false} />
                </span>
              ) : null}
              <span className={deck.text}>
                <span className={deck.eyebrow}>{card.eyebrow}</span>
                <span className={deck.name}>{card.subject}</span>
                {card.tag ? <span className={deck.tag}>{card.tag}</span> : null}
                <span className={deck.lines}>
                  {card.lines.map((l) => (
                    <span key={l} className={deck.line}>
                      {l}
                    </span>
                  ))}
                </span>
                {card.door === "pin" ? (
                  <span className={deck.acts}>
                    <Link href={`/r/${room}?say=1`} className={styles.door}>
                      <PinFace className={styles.doorFace} />
                      Leave one
                    </Link>
                  </span>
                ) : null}
              </span>
            </article>
          </div>

          <nav className={deck.turns} aria-label="Turn the deck">
            <button type="button" className={deck.turn} onClick={() => go(at - 1, -1)}>
              <span className={deck.turnGlyph} aria-hidden="true">
                ←
              </span>
              Back
            </button>
            <span className={deck.count}>
              {at + 1} <span className={deck.countOf}>of {cards.length}</span>
            </span>
            <button type="button" className={deck.turn} data-east="" onClick={() => go(at + 1, 1)}>
              On
              <span className={deck.turnGlyph} aria-hidden="true">
                →
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* The rail: the whole kit at once, wearing its objects. The telling
          draws the same row (Story.tsx) and for the same reason — nobody
          should have to turn eleven cards to find out what is on them. The
          two argument cards have no object, so they stand as an empty slot
          rather than borrowing one. */}
      <div className={deck.rail} role="tablist" aria-label="Everything in the kit">
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={i === at}
            aria-label={c.subject}
            title={c.subject}
            className={deck.railStop}
            data-live={i === at || undefined}
            onClick={() => go(i)}
          >
            {c.icon ? (
              <img
                src={c.icon.startsWith("/") ? c.icon : `/kit/${c.icon}`}
                alt=""
                draggable={false}
              />
            ) : (
              <span className={styles.railDot} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      {/* Leaving early is allowed, and should look allowed. */}
      <Link href={`/r/${room}`} className={styles.out}>
        Skip it and go stand somewhere
      </Link>
    </section>
  );
}
