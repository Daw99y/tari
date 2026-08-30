/* THE ROOM. The one full-bleed surface in the product (docs/TARI.md §11.2).
 *
 * Still not a client component, and now permanently. docs/SHELL.md
 * expected the 'use client' line to arrive with the cursors; it did not
 * have to. The live layer is three leaves — the chat, the cursors and the
 * moments — each its own client component, mounted at the bottom of this
 * file. Everything above them stays HTML the server streams, which is the
 * thing SHELL.md says a SPA cannot do: server does the guide, client does
 * the live, on the same page.
 *
 * Four of §4.3's bands have landed: the map, framed inside the room for
 * the rooms that have a plate; the past layer — what happened here lately,
 * read from the event log whelp plz is still writing; what drops here, from
 * the room files; and the guide, told on the land (Story.tsx) for the rooms
 * with a written one and a plate to tell it on. What closes still waits,
 * and an empty card would be worse than a clean room.
 *
 * The dock (components/Dock.tsx) wraps all of it: the map and an opened
 * item are two subjects on one stage — the middle of the photograph — and
 * only one stands there at a time. docs/DROPS.md has the argument. */

import Dock from "@/components/Dock";
import { type GuideFile } from "@/lib/guide";
import type { HuntSpot } from "@/lib/hunt";

import Chat from "./Chat";
import Cursors from "./Cursors";
import Decks from "./Decks";
import Drops from "./Drops";
import Left from "./Left";
import Kit from "./Kit";
import Story from "./Story";
import Moments from "./Moments";
import { outside } from "@/lib/adjacency";
import { age, lineParts, type Past } from "@/lib/live";
import { ROOM_BANDS } from "@/lib/room-bands";
import { type ClassId, type Item } from "@/lib/loot";
import type { Pin } from "@/lib/pins";
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
  guide: GuideFile | undefined;
  plate: ZonePlate | undefined;
  hunt: HuntSpot[];
  pins: Pin[];
  /** `?item=` — a door from the sheet, landing on one card. */
  open?: number;
};

export default function Room({ room, past, drops, cls, level, guide, plate, hunt, pins, open }: Props) {
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
        roomId={room.id}
        pins={pins}
        level={level}
        open={open}
        kit={drops.length > 0 ? <Kit drops={drops} cls={cls} level={level} room={room.name} /> : undefined}
      >
        {/* TWO DECKS, ONE TABLE. What we wrote and what the room wrote are
            different things and are never shuffled together; Decks.tsx holds
            the switch between them and the third answer, which is neither. */}
        <Decks
          pins={pins.length}
          telling={
            guide && guide.cards.length > 0 && plate ? (
              <Story key={`story-${room.id}`} file={guide} plate={plate} roomId={room.id} room={room.name} />
            ) : null
          }
          left={
            <Left
              key={`left-${room.id}`}
              room={room}
              band={ROOM_BANDS[room.id]}
              inside={outside(room.id)}
              plated={plate !== undefined}
              pins={pins}
            />
          }
        />

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

      {/* The live layer, over everything and asking for nothing when there
          is nobody here: each of the three renders null without a
          connection (app/(app)/Live.tsx). */}
      <Chat />
      <Moments />
      <Cursors />
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
