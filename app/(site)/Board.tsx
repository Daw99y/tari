"use client";

/* The world, medium.
 *
 * SIZE IS THE BRIEF, the same as the campfire's. This sits under the deck's
 * full-size window and over Classic+, and an earlier pass made it a scrolling
 * board of all seventy-nine rooms — which proved the claim and was another
 * extra-large slab. Seventy-nine rows is a page, not a beat.
 *
 * So the claim is made twice, small: once as arithmetic (the count, broken
 * into its five kinds, which is the whole world in five numbers) and once as
 * evidence (the handful of rooms with somebody in them right now). The board
 * itself still exists — it is the rail, inside the app.
 *
 * The counts are stand-ins and the caption says so; they are derived from the
 * room id so a reader who scrolls back sees the board they left. */

import { useMemo } from "react";

import { KIND_LABEL, KIND_ORDER, ROOMS, type RoomKind } from "@/lib/rooms";

import styles from "./board.module.css";

/* Modest on purpose. An unlaunched product printing three figures a room is
 * not a stand-in, it is a lie the reader can smell. */
function standIn(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const n = h % 100;
  if (n > 95) return 14 + (h % 9);
  if (n > 78) return 5 + (h % 6);
  if (n > 44) return 1 + (h % 4);
  return 0;
}

export default function Board() {
  const { kinds, busiest, occupied, total } = useMemo(() => {
    const kinds = KIND_ORDER.map((k: RoomKind) => ({
      k,
      label: KIND_LABEL[k],
      n: ROOMS.filter((r) => r.kind === k).length,
    }));
    const with_ = ROOMS.map((r) => ({ ...r, here: standIn(r.id) })).filter((r) => r.here > 0);
    return {
      kinds,
      busiest: [...with_].sort((a, b) => b.here - a.here).slice(0, 6),
      occupied: with_.length,
      total: with_.reduce((n, r) => n + r.here, 0),
    };
  }, []);

  return (
    <div className={styles.world}>
      <div className={styles.tally}>
        <p className={styles.big}>
          <strong>{ROOMS.length}</strong> rooms
        </p>
        <ul className={styles.kinds}>
          {kinds.map((k) => (
            <li key={k.k}>
              <span className={styles.kindN}>{k.n}</span>
              <span className={styles.kindLabel}>{k.label}</span>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          One Azeroth. Every realm, both factions, one of each place — and no server list anywhere in it.
        </p>
      </div>

      <aside className={styles.card}>
        <header className={styles.cardHead}>
          <h3>Somebody is in there</h3>
          <span className={styles.cardNote}>{occupied} rooms · {total} standing</span>
        </header>
        <ol className={styles.rows}>
          {busiest.map((r) => (
            <li key={r.id}>
              <a href={`/r/${r.id}`}>
                <span className={styles.name}>{r.name}</span>
                <span className={styles.bar} aria-hidden="true">
                  <i style={{ width: `${Math.round((r.here / busiest[0].here) * 100)}%` }} />
                </span>
                <span className={styles.here}>{r.here}</span>
              </a>
            </li>
          ))}
        </ol>
        <p className={styles.more}>and {ROOMS.length - busiest.length} more rooms, all open</p>
      </aside>
    </div>
  );
}
