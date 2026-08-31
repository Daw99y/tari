/* THE APP'S OWN WINDOW, STILL. One frame, drawn with the shell's own CSS —
 * the rail, the stage, the people column — with fake people and no wires.
 *
 * Everything visual is quoted from app/(app): shell.module.css draws the
 * frame, lib/rooms orders the rail, lib/adjacency names the doors. What the
 * live app reads from Ably and localStorage, this takes as props. The markup
 * mirrors Shell.tsx / Rail.tsx / You.tsx / People.tsx card for card, so the
 * mock cannot drift from the product without the diff saying so.
 *
 * Nothing in here is a control: links are spans, buttons are spans, and the
 * whole window hangs behind aria-hidden. It is a working photograph. */

import FoxMark from "@/components/FoxMark";
import RA from "@/components/RA";
import { classIcon, racePortrait } from "@/lib/character";
import { CLASS_COLOR } from "@/lib/class-color";
import { nextDoor, outside } from "@/lib/adjacency";
import {
  CONTINENT_LABEL,
  KIND_LABEL,
  ROOMS,
  bandLabel,
  roomThumb,
  roomsByKind,
  type Room,
} from "@/lib/rooms";

import styles from "../../(app)/shell.module.css";

/* ---- the one character every window agrees on */

export const ME = {
  name: "Imcamtspel",
  level: 29,
  cls: "rogue" as const,
  race: 1, // Human
  sex: 1,
  realm: "Pyrewood Village",
};

/* What is still waiting for a rogue at 29, per rail row. Invented counts on
 * real rooms — the same arrow the app draws, lib/drops-here's answer faked. */
const DROPS: Record<string, number> = {
  duskwood: 6,
  "loch-modan": 4,
  "the-barrens": 8,
  westfall: 2,
  "redridge-mountains": 3,
  wetlands: 5,
  "stranglethorn-vale": 9,
};

const FAVOURITES = ["undercity", "duskwood", "loch-modan", "the-barrens"];

const GROUPS = roomsByKind();
const OPEN_KINDS = new Set(["city", "zone"]);

export type Head = [name: string, band: string, cls: keyof typeof CLASS_COLOR | null];

export type Column =
  | { kind: "pick" }
  | {
      kind: "room";
      roomId: string;
      count: string;
      heads: Head[];
      doorCounts?: Record<string, number>;
    };

function Star({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill={on ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.2l2.72 5.52 6.08.89-4.4 4.29 1.04 6.06L12 17.1l-5.44 2.86 1.04-6.06-4.4-4.29 6.08-.89z" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      width="9"
      height="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.25 2.5L8 6l-3.75 3.5" />
    </svg>
  );
}

function Clyde() {
  return (
    <svg className={styles.meClyde} viewBox="0 0 127.14 96.36" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z"
      />
    </svg>
  );
}

/* One rail row, Rail.tsx's Card without the wires. */
function Card({ room, current, starred }: { room: Room; current: boolean; starred: boolean }) {
  const band = bandLabel(room);
  const drops = DROPS[room.id] ?? 0;
  return (
    <li className={styles.slot}>
      <span className={styles.room} data-current={current || undefined}>
        <img className={styles.roomArt} src={roomThumb(room.id)} alt="" loading="lazy" decoding="async" />
        <span className={styles.roomName}>
          {drops > 0 ? (
            <span className={styles.roomDrops} aria-hidden="true">
              <svg className={styles.roomUp} viewBox="0 0 24 24">
                <path
                  d="M12 2.4 20.4 11.2 H15.6 V19.8 Q15.6 21.4 14 21.4 H10 Q8.4 21.4 8.4 19.8 V11.2 H3.6 Z"
                  fill="currentColor"
                />
              </svg>
              <span className={styles.roomUpCount}>{drops}</span>
            </span>
          ) : null}
          <span>{room.name}</span>
          {band ? <span className={styles.roomBand}>{band}</span> : null}
        </span>
      </span>
      {starred ? (
        <span className={styles.star} data-on="">
          <Star on />
        </span>
      ) : null}
    </li>
  );
}

function MockRail({ current }: { current?: string }) {
  const pinned = ROOMS.filter((room) => FAVOURITES.includes(room.id));
  const card = (room: Room) => (
    <Card key={room.id} room={room} current={room.id === current} starred={FAVOURITES.includes(room.id)} />
  );

  return (
    <nav className={styles.rail}>
      <section className={styles.group}>
        <h2 className={`${styles.groupName} ${styles.pinnedName}`}>
          <Star className={styles.pinMark} on />
          <span className={styles.groupLabel}>Favourites</span>
          <span className={styles.groupCount}>{pinned.length}</span>
        </h2>
        <ul className={styles.rooms}>{pinned.map(card)}</ul>
      </section>

      {GROUPS.map((group) => {
        const shown = OPEN_KINDS.has(group.kind);
        return (
          <section key={group.kind} className={styles.group} data-open={shown ? "true" : "false"}>
            <h2 className={styles.groupName}>
              <span className={styles.groupToggle}>
                <Chevron className={styles.chevron} />
                <span className={styles.groupLabel}>{KIND_LABEL[group.kind]}</span>
                <span className={styles.groupCount}>{group.rooms.length}</span>
              </span>
              <span className={styles.groupLabelFlat}>{KIND_LABEL[group.kind]}</span>
            </h2>
            {group.sections
              ? group.sections.map((section) => (
                  <div key={section.continent} className={styles.continent}>
                    <p className={styles.continentName}>{CONTINENT_LABEL[section.continent]}</p>
                    <ul className={styles.rooms}>{section.rooms.map(card)}</ul>
                  </div>
                ))
              : shown ? <ul className={styles.rooms}>{group.rooms.map(card)}</ul> : null}
          </section>
        );
      })}
    </nav>
  );
}

/* You.tsx's foot: the plate, the campfire, and the quiet Discord offer. */
function MockFoot() {
  return (
    <footer className={styles.railFoot}>
      <div className={styles.meSplit}>
        <span className={styles.mePlate} style={{ ["--cls" as string]: CLASS_COLOR[ME.cls] }}>
          <span className={styles.mePortrait}>
            <img src={racePortrait(ME.race, ME.sex)} alt="" decoding="async" />
            <img className={styles.meClass} src={classIcon(ME.cls)} alt="" decoding="async" />
          </span>
          <span className={styles.meWords}>
            <span className={styles.meName}>{ME.name}</span>
            <span className={styles.meLine}>{ME.level} · Human Rogue</span>
          </span>
        </span>
        <span className={styles.mePath} style={{ ["--cls" as string]: CLASS_COLOR[ME.cls] }}>
          <RA name="campfire" className={styles.meFire} />
          <span className={styles.meWords}>
            <span className={styles.mePathName}>Campfire</span>
            <span className={styles.meLine}>What changed</span>
          </span>
        </span>
      </div>
      <span className={styles.meDoor}>
        <Clyde />
        <span className={styles.meHandle}>Sign in with Discord</span>
      </span>
    </footer>
  );
}

/* People.tsx: who is here, and what is next door. */
function MockPeople({ column }: { column: Column }) {
  if (column.kind === "pick") {
    return (
      <aside className={styles.people}>
        <div className={styles.here}>
          <h2 className={styles.columnName}>In the room</h2>
          <p className={styles.columnBody}>Pick a room to see who is standing in it.</p>
        </div>
      </aside>
    );
  }

  const doors = nextDoor(column.roomId);
  const out = outside(column.roomId);

  return (
    <aside className={styles.people}>
      <div className={styles.here}>
        <h2 className={styles.columnName}>In the room</h2>
        <p className={styles.hereCount}>{column.count}</p>
        <ul className={styles.heads}>
          {column.heads.map(([name, band, cls]) => (
            <li key={name} className={styles.head}>
              <span className={styles.headName} style={cls ? { color: CLASS_COLOR[cls] } : undefined}>
                {name}
              </span>
              <span className={styles.headBand}>{band}</span>
            </li>
          ))}
        </ul>
      </div>

      {doors.length > 0 ? (
        <div className={styles.doors}>
          <h2 className={styles.columnName}>{out ? `Outside, in ${out.name}` : "Next door"}</h2>
          <ul className={styles.rooms}>
            {doors.map((door) => {
              const n = column.doorCounts?.[door.id] ?? 0;
              return (
                <li key={door.id}>
                  <span className={styles.room}>
                    <img className={styles.roomArt} src={roomThumb(door.id)} alt="" loading="lazy" decoding="async" />
                    <span className={styles.roomName}>
                      <span>{door.name}</span>
                      {n > 0 ? <span className={styles.roomBand}>{n}</span> : null}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

export default function Window({
  current,
  column,
  children,
}: {
  /** The rail row the reader is standing in. */
  current?: string;
  column: Column;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell} aria-hidden="true">
      <div className={styles.railColumn}>
        <header className={styles.railHead}>
          <span className={styles.wordmark}>
            <FoxMark className={styles.fox} />
          </span>
          <div className={styles.railActs}>
            <span className={styles.kitLink}>Kit</span>
            <span className={styles.ask}>
              <kbd>⌘K</kbd>
            </span>
          </div>
        </header>
        <MockRail current={current} />
        <MockFoot />
      </div>

      <main className={styles.stage}>{children}</main>

      <MockPeople column={column} />
    </div>
  );
}
