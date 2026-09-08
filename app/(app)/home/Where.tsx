/* WHERE YOU ARE — the first column of the front door. docs/DIRECTION.md §3.
 *
 * IT NEVER CLAIMS TO KNOW. §4.1 settled this and rule 9 enforces it: the
 * combat log does not reach disk until logout, so the newest fact Tari holds
 * about a reader's whereabouts is where they logged out last time. The head of
 * this column therefore says "Last seen" and links straight to a picker. There
 * is no pulse, no dot, no "you are in", and the word "now" appears exactly
 * once on this screen — over the room's population, which is a fact about the
 * room and not about the reader.
 *
 * THE PICTURE IS THE POINT. Every other row here is text, so the zone's own
 * photograph carries the whole column: it is the only thing on the front door
 * that says Azeroth rather than dashboard, and it is the handle the eye
 * reaches for when the reader wants to be somewhere. Cropped short, graded the
 * one grade (docs/DESIGN.md), and it is a door.
 *
 * A SERVER COMPONENT WITH TWO CLIENT LEAVES, which is the room page's shape.
 * The loot file and the quest index are large and stay here; the population
 * ticks and the picker navigates, so those two carry 'use client' and nothing
 * else does.
 */

import Link from "next/link";

import { bestQuality, type QuestHere } from "@/lib/here";
import { iconUrl, type Item } from "@/lib/loot";
import type { Pin } from "@/lib/pins";
import { roomArt, type Room } from "@/lib/rooms";

import Population from "./Population";
import Settle from "./Settle";
import ZonePicker from "./ZonePicker";
import styles from "./home.module.css";

const QUALITY_INK: Record<string, string> = {
  Legendary: "#ff8000",
  Epic: "#a335ee",
  Rare: "#0070dd",
  Uncommon: "#1eff00",
  Common: "#ffffff",
  Poor: "#9d9d9d",
};

/** Why the column is looking here, said in three words over the picker.
 *
 *  "Last seen here" is the only one that makes a claim about the reader, and
 *  it is the honest one: the client hands a zone over on logout and never
 *  while they are playing (docs/DIRECTION.md §4.1). "Most for you in" is a
 *  claim about the zone. "Looking at" makes none. */
const STAMP: Record<"asked" | "seen" | "picked", string> = {
  asked: "Looking at",
  seen: "Last seen here",
  picked: "Most for you in",
};

export default function Where({
  room,
  band,
  stamp,
  level,
  knowsClass,
  drops,
  quests,
  pins,
}: {
  room: Room;
  band: { min: number; max: number } | null;
  /** Which of the three rules put the column on this zone. */
  stamp: "asked" | "seen" | "picked";
  level: number;
  /** Whether the rows are filtered to a class. A reader with no character
   *  gets every class's loot and should be told so, once. */
  knowsClass: boolean;
  drops: Item[];
  quests: QuestHere[];
  pins: Pin[];
}) {
  const here = `/r/${room.id}`;
  /* `pinsIn` hands back the openings with their replies nested inside them
     (lib/pins-db.ts), so this is already the count of things said here rather
     than of rows in the table. */
  const said = pins;

  return (
    <section className={styles.column} aria-label="Where you are">
      <Link href={here} className={styles.plate} prefetch>
        <img className={styles.plateArt} src={roomArt(room.id)} alt="" draggable={false} />
        <span className={styles.plateInk}>
          <span className={styles.plateName}>{room.name}</span>
          {band ? (
            <span className={styles.plateBand}>
              {band.min}–{band.max}
            </span>
          ) : null}
        </span>
      </Link>

      <div className={styles.stamp}>
        <span className={styles.stampWord}>{STAMP[stamp]}</span>
        <ZonePicker current={room.id} />
      </div>

      {/* Only an auto-pick is allowed to move on its own. A zone the reader
          asked for, or the one the client last saw them in, stays put. */}
      {stamp === "picked" ? <Settle current={room.id} /> : null}

      <Population room={room.id} />

      <Block
        name={knowsClass ? `Drops here at ${level}` : `Drops here at ${level}, all classes`}
        empty="Nothing in this zone is tuned for your level. Pick another."
        count={drops.length}
      >
        {drops.map((item) => (
          <li key={item.itemId} className={styles.row}>
            <Link href={`${here}?item=${item.itemId}`} className={styles.rowLink} prefetch={false}>
              {iconUrl(item) ? (
                <img className={styles.icon} src={iconUrl(item)!} alt="" loading="lazy" draggable={false} />
              ) : (
                <span className={styles.icon} />
              )}
              <span className={styles.rowName} style={{ color: QUALITY_INK[item.quality] }}>
                {item.name}
              </span>
              <span className={styles.rowMeta}>{item.slot}</span>
            </Link>
          </li>
        ))}
      </Block>

      <Block
        name="Quests here that pay in gear"
        empty="The pipeline has no gear quests for this zone at your level."
        count={quests.length}
      >
        {quests.map((q) => (
          <li key={q.id} className={styles.row}>
            <Link href={`${here}?item=${q.rewards[0].itemId}`} className={styles.rowLink} prefetch={false}>
              <span className={styles.questLevel}>{q.level}</span>
              <span className={styles.rowName}>{q.name}</span>
              <span className={styles.rowMeta} style={{ color: QUALITY_INK[bestQuality(q)] }}>
                {q.rewards[0].name}
              </span>
            </Link>
          </li>
        ))}
      </Block>

      <Block
        name="Left here"
        empty="Nobody has left anything here. Be first."
        count={said.length}
      >
        {said.slice(0, 6).map((p) => (
          <li key={p.id} className={styles.pin}>
            <Link href={here} className={styles.pinLink} prefetch={false}>
              <span className={styles.pinBody}>{p.body}</span>
              <span className={styles.pinWho}>
                {p.who} · {p.level}
              </span>
            </Link>
          </li>
        ))}
      </Block>
    </section>
  );
}

/* A HEADING, ITS COUNT, AND WHAT IT SAYS WHEN THERE IS NOTHING.
 *
 * The empty line is a sentence with somewhere to go in it, never an apology
 * and never a shrug: a zone with no drops at your level is a reason to move,
 * and a room with no pins is an opening. */
function Block({
  name,
  empty,
  count,
  children,
}: {
  name: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.block}>
      <p className={styles.blockName}>
        {name}
        {count > 0 ? <span className={styles.blockCount}>{count}</span> : null}
      </p>
      {count > 0 ? <ul className={styles.rows}>{children}</ul> : <p className={styles.empty}>{empty}</p>}
    </div>
  );
}
