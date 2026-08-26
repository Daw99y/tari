"use client";

/* THE MOMENT THAT CROSSES EVERY SCREEN. docs/TARI.md §8: someone dings 60
 * and it crosses every screen.
 *
 * This is that primitive, built early and by hand while the addon catches
 * up. A mark sent here rises through the middle of the photograph on
 * everybody's screen at once and is gone in under three seconds — no
 * history, no count, nothing to scroll. That is the point: it is a room
 * reacting, not a room recording. The event log (lib/live.ts) is where
 * things are kept.
 *
 * The ding lands on this same channel the day the addon can post it
 * (docs/CHARACTER.md's flow): a `levelled` event becomes a mark nobody had
 * to press.
 *
 * Bottom-centre, because it is the one thing down here addressed to the
 * whole room rather than to one reader — chat is bottom-left, the objects
 * are bottom-right, and the middle is what everyone is already looking
 * at. */

import { useCallback, useEffect, useState } from "react";
import { useRoomReactions } from "@ably/chat/react";

import { useLive } from "../../Live";
import styles from "./moments.module.css";

/** Five, and no picker. A long list of feelings is a different product. */
const MARKS = [
  { name: "wave", glyph: "👋", says: "Say hello" },
  { name: "ding", glyph: "✨", says: "Ding" },
  { name: "pull", glyph: "⚔️", says: "Pulling" },
  { name: "cheers", glyph: "🍺", says: "Cheers" },
  { name: "thanks", glyph: "❤️", says: "Thanks" },
];

const GLYPH = new Map(MARKS.map((m) => [m.name, m.glyph]));

/** How long a mark is on screen. Long enough to catch, short enough that
 *  ten of them at once is weather rather than a wall. */
const LIFE_MS = 2_800;

type Rising = { id: number; glyph: string; drift: number; sway: number };

export default function Moments() {
  const { up } = useLive();
  if (!up) return null;
  return <Marks />;
}

function Marks() {
  const [rising, setRising] = useState<Rising[]>([]);

  const { sendRoomReaction } = useRoomReactions({
    listener: (event) => {
      const glyph = GLYPH.get(event.reaction.name);
      if (!glyph) return;
      setRising((was) => [
        /* A cap, because a room can always find a way to press a button
           four hundred times. */
        ...was.slice(-24),
        {
          id: Math.random(),
          glyph,
          /* Spread across the middle third so two at once are two things. */
          drift: Math.random() * 34 - 17,
          sway: Math.random() * 22 - 11,
        },
      ]);
    },
  });

  /* Nothing keeps a mark. They are swept on a timer rather than on an
     animation event, because a backgrounded tab never fires one. */
  useEffect(() => {
    if (rising.length === 0) return;
    const sweep = setTimeout(() => setRising((was) => was.slice(1)), LIFE_MS);
    return () => clearTimeout(sweep);
  }, [rising]);

  const send = useCallback(
    (name: string) => {
      void sendRoomReaction({ name }).catch(() => {});
    },
    [sendRoomReaction]
  );

  return (
    <div className={styles.moments} data-moments>
      <div className={styles.sky} aria-hidden="true">
        {rising.map((r) => (
          <span
            key={r.id}
            className={styles.mark}
            style={
              {
                left: `calc(50% + ${r.drift}%)`,
                "--sway": `${r.sway}px`,
              } as React.CSSProperties
            }
          >
            {r.glyph}
          </span>
        ))}
      </div>

      <div className={styles.rail}>
        <span className={styles.rest} aria-hidden="true">
          ✦
        </span>
        <div className={styles.marks}>
          {MARKS.map((m) => (
            <button
              key={m.name}
              type="button"
              className={styles.pick}
              onClick={() => send(m.name)}
              title={m.says}
              aria-label={m.says}
            >
              {m.glyph}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
