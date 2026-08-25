/* THE ROOM. The one full-bleed surface in the product (docs/TARI.md §11.2).
 *
 * Not a client component yet, on purpose. docs/SHELL.md has it as one
 * because cursors and the pins layer live in it; neither exists until the
 * live layer does, and until then this is HTML the server streams. The
 * 'use client' line goes on the day the pins arrive, and its place in the
 * tree does not change.
 *
 * What is missing here, and is missing on purpose: the seven bands of §4.3 —
 * the guide, what closes, who came through, the pins, the loot panel. Every
 * one of them needs the pipeline's zone files, which are not in this repo.
 * An empty card that says "coming soon" would be worse than a clean room. */

import { CONTINENT_LABEL, roomArt, type Room as RoomType } from "@/lib/rooms";

import styles from "./room.module.css";

const KIND_WORD: Record<RoomType["kind"], string> = {
  city: "City",
  zone: "Zone",
  dungeon: "Dungeon",
  raid: "Raid",
  place: "Place",
};

export default function Room({ room }: { room: RoomType }) {
  return (
    <article className={styles.room}>
      <img
        key={room.id}
        className={styles.art}
        src={roomArt(room.id)}
        alt=""
        decoding="async"
        fetchPriority="high"
      />
      <div className={styles.scrim} />
      <div className={styles.card}>
        <h1 className={styles.name}>{room.name}</h1>
        <p className={styles.line}>
          {KIND_WORD[room.kind]} · {CONTINENT_LABEL[room.continent]}
        </p>
      </div>
    </article>
  );
}
