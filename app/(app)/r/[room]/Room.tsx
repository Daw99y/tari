/* THE ROOM. The one full-bleed surface in the product (docs/TARI.md §11.2).
 *
 * Not a client component yet, on purpose. docs/SHELL.md has it as one
 * because cursors and the pins layer live in it; neither exists until the
 * live layer does, and until then this is HTML the server streams. The
 * 'use client' line goes on the day the pins arrive, and its place in the
 * tree does not change.
 *
 * The map is the first of §4.3's bands to land: framed inside the room,
 * carrying the authored layer, for the rooms that have a plate. The rest —
 * the guide, what closes, who came through, the loot panel — still wait on
 * the pipeline's zone files, and an empty card would be worse than a clean
 * room. */

import MapDock from "@/components/MapDock";
import { plateFor } from "@/lib/maps";
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
  const plate = plateFor(room.id);

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

      {plate ? <MapDock plate={plate} title={room.name} /> : null}
      <div className={styles.card}>
        <p className={styles.line}>
          {KIND_WORD[room.kind]} · {CONTINENT_LABEL[room.continent]}
        </p>
        <h1 className={styles.name}>{room.name}</h1>
      </div>
    </article>
  );
}
