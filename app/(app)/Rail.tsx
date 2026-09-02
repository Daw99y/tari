"use client";

/* THE RAIL. Discord's rail is a list of servers you joined; Tari's rail is
 * Azeroth (docs/TARI.md §11.2).
 *
 * WHICH MEANS IT IS ORDERED LIKE THE WORLD AND NOT LIKE AN INDEX. Zones and
 * dungeons run low band to high inside each continent, and every one of those
 * rows carries its band. Alphabetical asked the reader to already know that
 * Duskwood is where a level 24 goes — the one thing somebody opening this for
 * the first time cannot know. See roomsByKind and bandOf in lib/rooms.ts for
 * why cities, raids and places are left in their written order instead.
 *
 * So every row carries the room's own photograph rather than an icon of it.
 * The art is held down dark and lifts under the pointer — the list reads as
 * a column of places at dusk, and each one has its own colour before you
 * have read a single name.
 *
 * SEVENTY-FIVE ROOMS IS A SCROLL, NOT A LIST. Drawn open, the rail is a
 * quarter-screen column you page through to reach Winterspring. So the five
 * kinds fold: the one you are standing in opens itself, the rest wait, and
 * the rail's whole height is five headings and the places you are actually
 * among. What you shut stays shut on the next visit.
 *
 * AND FOLDING HIDES THINGS, so the rail grows a pin. A star on a card lifts
 * that room into a block above every kind, where it stays whatever is folded
 * underneath. The stars are `fav` marks (lib/marks.ts) — per character, kept
 * on this machine, and carried to the reader's other machine by the same
 * request the rest of the record will use.
 *
 * Nothing spins (§11.3): a row prefetches its room on hover, so the RSC
 * payload is usually in the router cache before the click lands. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { loadCharacter, type Character } from "@/lib/character";
import { dropsHere } from "@/lib/drops-here";
import { DROP_QUALITIES } from "@/lib/room-drops";
import { setMark, silence, subjectsOn, sync, useMarks } from "@/lib/marks";
import { gearFrom } from "@/lib/plan";
import { judgeFor } from "@/lib/upgrade";
import { useWornDict } from "@/lib/use-worn";
import {
  CONTINENT_LABEL,
  KIND_LABEL,
  ROOMS,
  bandLabel,
  type Room,
  type RoomKind,
  roomThumb,
  roomsByKind,
} from "@/lib/rooms";

import { useRoomId } from "./room-context";
import styles from "./shell.module.css";

const GROUPS = roomsByKind();

/** The kinds whose rows carry a drop count — the rooms you pick off a list
 *  because of what drops in them. A capital you visit because you are
 *  already going, so the kinds with no honest count stay bare. */
const COUNTED: ReadonlySet<RoomKind> = new Set(["zone", "dungeon", "raid"]);

/** Which kinds the reader left open. Not the character's business and not
 *  worth a round trip — this is a preference about a screen, so it stays on
 *  the screen it belongs to. */
const OPEN_KEY = "tari:rail-open";

type Open = Partial<Record<RoomKind, boolean>>;

function readOpen(): Open {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : null;
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Open) : {};
  } catch {
    return {};
  }
}

export default function Rail({ signedIn }: { signedIn: boolean }) {
  const here = useRoomId();
  const pathname = usePathname();
  const marks = useMarks();

  /* Stars belong to a character, so there are none before there is one. The
     shell sends a reader with no character to the creator, which makes this
     a doorstep state rather than a lasting one. */
  /* The whole character now, not only its key: the stars need the key and the
     drop counts need the class and the level, and reading the roster twice for
     two fields of one record would be the same lookup done twice a page. */
  const [me, setMe] = useState<Character | null>(null);
  const char = me?.key ?? null;
  const [open, setOpen] = useState<Open>({});

  useEffect(() => {
    setMe(loadCharacter());
  }, [pathname]);

  /* One pull on arrival: whatever the reader starred on the other machine is
     on the screen before they reach for anything.

     The layout already read the session on the server, so a signed-out reader
     never makes the request rather than making it and being told 401. Most
     readers are signed out — COMMUNITY.md would rather they were — and a
     refused request per page load is a cost paid by the majority. */
  useEffect(() => {
    if (signedIn) void sync();
    else silence();
  }, [signedIn]);

  useEffect(() => {
    setOpen(readOpen());
  }, []);

  /* The kind you are standing in opens itself — on arrival, and again on the
     day you follow a next-door link into a kind you had folded away. It is
     written down like any other fold, so you can shut it again and it stays
     shut until you come back. */
  const hereKind = here ? ROOMS.find((r) => r.id === here)?.kind : undefined;
  useEffect(() => {
    if (!hereKind) return;
    setOpen((was) => (was[hereKind] ? was : save({ ...was, [hereKind]: true })));
  }, [hereKind]);

  function save(next: Open): Open {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      // Storage off. The folds work; the rail just forgets them at the door.
    }
    return next;
  }

  const starred = char ? new Set(subjectsOn(marks, char, "fav")) : new Set<string>();
  /* One set for the whole rail rather than one per row: seventy-five rows ask
     this, and the found record is the same record for all of them. */
  const found = char ? new Set(subjectsOn(marks, char, "found")) : new Set<string>();
  const isFound = (itemId: number) => found.has(String(itemId));

  /* THE JUDGE (lib/upgrade.ts): a badge is a promise of upgrades, so a row
     only counts if it beats what the character wears — the plan's dressing
     included, the same gear the sheet reads. Until the worn rows land the
     judge refuses everything and the badges arrive a beat late rather than
     counting high and correcting themselves. */
  const gear = useMemo(() => gearFrom(marks, me), [marks, me]);
  const dict = useWornDict(me ? gear : []);
  const judge = me ? judgeFor(gear, dict) : undefined;

  /* WHAT IS WAITING FOR YOU IN THERE, on the row rather than behind it.
     The badge hides itself at zero either way — see dropsHere, which also
     names the finest rarity still waiting so the figure can wear that
     colour. */
  const countFor = (room: Room) =>
    me && COUNTED.has(room.kind)
      ? dropsHere(room.id, me.cls, me.level, isFound, judge)
      : { open: 0, best: 0 };
  /* ROOMS is written continent by continent inside kind, and the pinned block
     reads in that same order — so a starred room never moves once it is up
     there, and never sorts itself out from under the pointer. */
  const pinned = ROOMS.filter((room) => starred.has(room.id));

  function star(room: Room, on: boolean) {
    if (char) setMark(char, "fav", room.id, on);
  }

  function card(room: Room) {
    const { open, best } = countFor(room);
    return (
      <Card
        key={room.id}
        room={room}
        current={room.id === here}
        starred={starred.has(room.id)}
        canStar={char !== null}
        onStar={star}
        drops={open}
        quality={DROP_QUALITIES[best]}
      />
    );
  }

  return (
    <nav className={styles.rail} aria-label="Azeroth">
      {char ? (
        <section className={styles.group}>
          <h2 className={`${styles.groupName} ${styles.pinnedName}`}>
            <Star className={styles.pinMark} on />
            <span className={styles.groupLabel}>Favourites</span>
            {pinned.length > 0 && <span className={styles.groupCount}>{pinned.length}</span>}
          </h2>
          {pinned.length > 0 ? (
            <ul className={styles.rooms}>{pinned.map(card)}</ul>
          ) : (
            <p className={styles.pinHint}>Star a room to pin it here.</p>
          )}
        </section>
      ) : null}

      {GROUPS.map((group) => {
        const shown = open[group.kind] === true;
        return (
          /* The fold is a CSS state rather than a branch in the render, and
             the rooms are always in the document. Which matters on a phone:
             the sideways rail does not fold, and deciding that here would
             mean asking matchMedia — which cannot answer until after the
             first paint, so every visit would start with a folded rail and
             then unfold itself. */
          <section
            key={group.kind}
            className={styles.group}
            data-open={shown ? "true" : "false"}
          >
            <h2 className={styles.groupName}>
              <button
                type="button"
                className={styles.groupToggle}
                aria-expanded={shown}
                onClick={() => setOpen((was) => save({ ...was, [group.kind]: !shown }))}
              >
                <Chevron className={styles.chevron} />
                <span className={styles.groupLabel}>{KIND_LABEL[group.kind]}</span>
                <span className={styles.groupCount}>{group.rooms.length}</span>
              </button>
              {/* The same word for the strip that has no fold to offer. One
                  of the two is always display:none, so only one is read. */}
              <span className={styles.groupLabelFlat}>{KIND_LABEL[group.kind]}</span>
            </h2>
            {group.sections ? (
              /* Two lists under one heading, and the continent is a caption
                 rather than a second fold: the kinds are what a reader shuts,
                 and offering to shut half of Azeroth would be a fold inside a
                 fold for no question anybody asks. */
              group.sections.map((section) => (
                <div key={section.continent} className={styles.continent}>
                  <p className={styles.continentName}>
                    {CONTINENT_LABEL[section.continent]}
                  </p>
                  <ul className={styles.rooms}>{section.rooms.map(card)}</ul>
                </div>
              ))
            ) : (
              <ul className={styles.rooms}>{group.rooms.map(card)}</ul>
            )}
          </section>
        );
      })}
    </nav>
  );
}

/* A row and its star are siblings rather than one inside the other: a button
 * nested in a link is neither, and a reader on a keyboard should reach the
 * room and the star as two separate stops. */
function Card({
  room,
  current,
  starred,
  canStar,
  onStar,
  drops,
  quality,
}: {
  room: Room;
  current: boolean;
  starred: boolean;
  canStar: boolean;
  onStar: (room: Room, on: boolean) => void;
  /** Still waiting in there for this character. Zero draws nothing. */
  drops: number;
  /** The finest rarity among them — the figure wears its colour. */
  quality: string;
}) {
  const router = useRouter();
  const band = bandLabel(room);

  return (
    <li className={styles.slot}>
      <Link
        href={`/r/${room.id}`}
        prefetch
        onPointerEnter={() => router.prefetch(`/r/${room.id}`)}
        className={styles.room}
        data-current={current || undefined}
        aria-current={current ? "page" : undefined}
        /* The badge is aria-hidden — a bare numeral read out after a place
           name is noise — so the row says the whole thing once, here. */
        aria-label={
          drops > 0
            ? `${room.name} — ${drops} still to find`
            : undefined
        }
      >
        {/* The small copy, not the master: 75 rows of full-bleed art is 14 MB
            of pictures nobody has asked for yet. See scripts/rail-thumbs.mjs. */}
        <img
          className={styles.roomArt}
          src={roomThumb(room.id)}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className={styles.roomName}>
          {/* THE SUMMONS, AT RAIL SIZE. The same arrow the room's own corner
              draws (app/(app)/r/[room]/Drops.tsx) and the same green, at a
              twelfth of the size: a reader who has learned what it means in
              the corner reads it here without being told twice. The count
              rides its shoulder the way the big one does, and neither the
              glyph nor the figure appears at all when there is nothing
              waiting — an arrow saying nought is a row with a nought on it. */}
          {drops > 0 ? (
            <span className={styles.roomDrops} aria-hidden="true">
              <svg className={styles.roomUp} viewBox="0 0 24 24">
                <path
                  d="M12 2.4 20.4 11.2 H15.6 V19.8 Q15.6 21.4 14 21.4 H10 Q8.4 21.4 8.4 19.8 V11.2 H3.6 Z"
                  fill="currentColor"
                />
              </svg>
              <span className={styles.roomUpCount} data-quality={quality}>
                {drops}
              </span>
            </span>
          ) : null}
          <span>{room.name}</span>
          {/* The one thing a name cannot say. Held well back — it is what you
              check, not what you read — and absent rather than approximated on
              the kinds that have no honest number. See bandOf. */}
          {band ? <span className={styles.roomBand}>{band}</span> : null}
        </span>
      </Link>
      {canStar && (
        <button
          type="button"
          className={styles.star}
          data-on={starred || undefined}
          aria-pressed={starred}
          aria-label={starred ? `Unstar ${room.name}` : `Star ${room.name}`}
          onClick={() => onStar(room, !starred)}
        >
          <Star on={starred} />
        </button>
      )}
    </li>
  );
}

/* Hollow until it is yours, and then the compass's gold — the one warm
 * colour this app has already chosen (components/dock.module.css). */
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
