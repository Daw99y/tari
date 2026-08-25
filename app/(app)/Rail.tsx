"use client";

/* THE RAIL. Discord's rail is a list of servers you joined; Tari's rail is
 * Azeroth (docs/TARI.md §11.2).
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
import { useEffect, useState } from "react";

import { loadCharacter } from "@/lib/character";
import { setMark, silence, subjectsOn, sync, useMarks } from "@/lib/marks";
import { KIND_LABEL, ROOMS, type Room, type RoomKind, roomThumb, roomsByKind } from "@/lib/rooms";

import { useRoomId } from "./room-context";
import styles from "./shell.module.css";

const GROUPS = roomsByKind();

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
  const [char, setChar] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>({});

  useEffect(() => {
    setChar(loadCharacter()?.key ?? null);
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
  /* ROOMS is written continent by continent inside kind, and the pinned block
     reads in that same order — so a starred room never moves once it is up
     there, and never sorts itself out from under the pointer. */
  const pinned = ROOMS.filter((room) => starred.has(room.id));

  function star(room: Room, on: boolean) {
    if (char) setMark(char, "fav", room.id, on);
  }

  function card(room: Room) {
    return (
      <Card
        key={room.id}
        room={room}
        current={room.id === here}
        starred={starred.has(room.id)}
        canStar={char !== null}
        onStar={star}
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
            <ul className={styles.rooms}>{group.rooms.map(card)}</ul>
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
}: {
  room: Room;
  current: boolean;
  starred: boolean;
  canStar: boolean;
  onStar: (room: Room, on: boolean) => void;
}) {
  const router = useRouter();

  return (
    <li className={styles.slot}>
      <Link
        href={`/r/${room.id}`}
        prefetch
        onPointerEnter={() => router.prefetch(`/r/${room.id}`)}
        className={styles.room}
        data-current={current || undefined}
        aria-current={current ? "page" : undefined}
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
          <span>{room.name}</span>
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
 * colour this app has already chosen (components/map-dock.module.css). */
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
