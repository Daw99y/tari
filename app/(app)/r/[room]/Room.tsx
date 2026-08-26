/* THE ROOM. The one full-bleed surface in the product (docs/TARI.md §11.2).
 *
 * Not a client component yet, on purpose. docs/SHELL.md has it as one
 * because cursors and the pins layer live in it; neither exists until the
 * live layer does, and until then this is HTML the server streams. The
 * 'use client' line goes on the day the pins arrive, and its place in the
 * tree does not change.
 *
 * Four of §4.3's bands have landed: the map, framed inside the room for
 * the rooms that have a plate; the past layer — what happened here lately,
 * read from the event log whelp plz is still writing; what drops here, from
 * the room files; and the guide, for the rooms with a written one. What
 * closes still waits, and an empty card would be worse than a clean room.
 *
 * The dock (components/Dock.tsx) wraps all of it: the map and an opened
 * item are two subjects on one stage — the middle of the photograph — and
 * only one stands there at a time. docs/DROPS.md has the argument. */

import Dock from "@/components/Dock";
import { type Card } from "@/lib/guide";
import type { HuntSpot } from "@/lib/hunt";

import Drops from "./Drops";
import Guide from "./Guide";
import Kit from "./Kit";
import { age, lineParts, type Past } from "@/lib/live";
import { type ClassId, type Item } from "@/lib/loot";
import type { ZonePlate } from "@/lib/plate";
import { CONTINENT_LABEL, roomArt, type Room as RoomType } from "@/lib/rooms";

import styles from "./room.module.css";

const KIND_WORD: Record<RoomType["kind"], string> = {
  city: "City",
  zone: "Zone",
  dungeon: "Dungeon",
  raid: "Raid",
  place: "Place",
};

type Props = {
  room: RoomType;
  past: Past;
  drops: Item[];
  cls: ClassId | null;
  level: number;
  guide: Card[];
  plate: ZonePlate | undefined;
  hunt: HuntSpot[];
};

export default function Room({ room, past, drops, cls, level, guide, plate, hunt }: Props) {
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

      <Dock
        plate={plate}
        hunt={hunt}
        drops={drops}
        room={room.name}
        level={level}
        kit={drops.length > 0 ? <Kit drops={drops} cls={cls} level={level} room={room.name} /> : undefined}
      >
        {guide.length > 0 ? <Guide key={`guide-${room.id}`} cards={guide} /> : null}

        {past.rows.length > 0 || drops.length > 0 ? (
          <div className={styles.objects}>
            {past.rows.length > 0 ? <Lately past={past} /> : null}
            {drops.length > 0 ? <Drops drops={drops} cls={cls} level={level} /> : null}
          </div>
        ) : null}

        <div className={styles.card}>
          <p className={styles.line}>
            {KIND_WORD[room.kind]} · {CONTINENT_LABEL[room.continent]}
          </p>
          <h1 className={styles.name}>{room.name}</h1>
        </div>
      </Dock>
    </article>
  );
}

/* The past layer. A card (docs/CONTRAST.md surface B) because it sits on
 * the right, off the scrim. Only rendered when there is something to say. */
function Lately({ past }: { past: Past }) {
  return (
    <aside className={styles.lately} aria-label="Lately, in this room">
      <p className={styles.latelyHead}>
        Lately
        {past.today > 0 ? (
          <span className={styles.latelyCount}>
            {" · "}
            {past.today} came through today
          </span>
        ) : null}
      </p>
      <ol className={styles.latelyList}>
        {past.rows.map((row) => {
          const { lead, name, tail } = lineParts(row);
          return (
            <li key={row.id} className={styles.latelyRow}>
              <span className={styles.latelyText}>
                {lead}
                {name ? <strong>{name}</strong> : null}
                {tail}
              </span>
              <span className={styles.latelyAge}>{age(row.ageSeconds)}</span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
