"use client";

/* RESTED, in the room. docs/WELCOME.md §4; lib/rested.ts holds the argument.
 *
 * TARI.md §4.3 band 2 — "since you were last here" — and §4.2 calls it the only
 * thing that makes a place you already know worth reopening.
 *
 * IT LIVES IN THE PEOPLE COLUMN, at the foot of it, over the doors. Kacey,
 * 2026-08-31, and it is the right call for a reason worth writing down: it was
 * built as a card floating on the art, which made it a fifth thing competing
 * for a corner of a photograph that has run out of corners. The column is
 * already the room's other half — who is here at the top, the way out at the
 * bottom — and *what happened while you were gone* is the same question as
 * both of them, asked about a time rather than a place. Sat between them it
 * needs no card, no scrim and no breakpoint: the column is not on the art, so
 * docs/CONTRAST.md does not bind it and it can wear the shell's own inks.
 *
 * ABOVE THE DOORS AND NEVER BELOW. The doors are how you leave. Anything under
 * them is read after the reader has already decided to go.
 *
 * IT IS A CLIENT LEAF BECAUSE THE CURSOR IS. The cursor is a `been` mark, and
 * marks are localStorage first and synced only for a reader who signed in
 * (lib/marks.ts, COMMUNITY.md). The server cannot know when you were last here
 * without being told, and being told would mean either an account requirement
 * or a cookie growing a row per room. So the browser reads its own cursor,
 * asks, and stamps — and Room.tsx stays HTML the server streams.
 *
 * THE STAMP LANDS AFTER THE READ, ALWAYS. Stamping on arrival would spend the
 * absence before it was drawn, and the reader would walk into nine days of
 * news and be shown none of it. The order is read the cursor, ask, draw, then
 * move the cursor to now.
 *
 * IT STAMPS EVEN WHEN IT DRAWS NOTHING, and that is the whole floor. Walking
 * out of a room and back in is not an absence; without the stamp on the quiet
 * path, an hour of standing in the sheet would come back as news.
 *
 * NOTHING HERE IS DISMISSED AND NOTHING IS KEPT. There is no close button
 * because there is nothing to close — the card is gone on the next visit by
 * construction, since the cursor it was measured from has moved. A dismissable
 * card is a thing you have to deal with, and §4 is not a chore.
 */

import { useEffect, useState } from "react";

import { loadCharacter, WHO_EVENT, type Character } from "@/lib/character";
import { marksNow, setMark, valOf } from "@/lib/marks";
import { PinFace } from "@/components/PinChip";
import {
  hasNews,
  restedDays,
  restedHead,
  restedRows,
  RESTED_FLOOR_MS,
  RESTED_STAMP_MS,
  type RestedRow,
  type Rested as News,
} from "@/lib/rested";

import { useRoomId } from "./room-context";
import styles from "./shell.module.css";

export default function Rested() {
  const room = useRoomId();
  const [news, setNews] = useState<News | null>(null);

  useEffect(() => {
    if (!room) return;
    /* Bound after the guard, not before: a closure reads a const at its
       declared type, so `here` has to be narrow where it is declared for the
       reads inside `look` to see a room rather than a maybe. The column is
       mounted on every page in the shell and only some of them are rooms. */
    const here: string = room;
    /* The character can change under a room that does not remount — the sheet
       switches in place (lib/character.ts, WHO_EVENT) — and Rested is about
       one character's absence, so it re-reads rather than trusting the mount. */
    let live = true;
    let ran: string | null = null;
    /* Which read is the current one. A character switched mid-flight leaves an
       older request in the air, and the room must not draw one character's
       absence over another's name. */
    let turn = 0;

    async function look() {
      const who: Character | null = loadCharacter();
      if (!who || ran === who.key) return;
      ran = who.key;
      const mine = ++turn;
      setNews(null);

      const cursor = valOf(marksNow(), who.key, "been", here);
      const stamp = () => {
        /* Fresh enough to still be true. Six clicks along the rail and back is
           not six absences, and it should not be six writes either. */
        if (cursor && Date.now() - Date.parse(cursor) < RESTED_STAMP_MS) return;
        setMark(who.key, "been", here, true, new Date().toISOString());
      };

      /* Never been here, or a mark from before the cursor carried a time.
         Nothing to say about an absence that has not happened yet (§5.2:
         it renders what you have and never what you haven't). */
      if (!cursor) return stamp();

      const away = Date.now() - Date.parse(cursor);
      if (!Number.isFinite(away) || away < RESTED_FLOOR_MS) return stamp();

      try {
        const at = `&at=${who.level}`;
        const res = await fetch(`/api/rested?room=${encodeURIComponent(here)}&since=${encodeURIComponent(cursor)}${at}`);
        const body = (await res.json()) as { rested: News | null };
        if (!live || mine !== turn) return;
        if (body.rested && hasNews(body.rested)) setNews(body.rested);
      } catch {
        /* A homecoming that could not be read is a room, not an error. */
      } finally {
        /* The absence is spent whether or not it had anything in it. */
        if (live && mine === turn) stamp();
      }
    }

    void look();
    const again = () => void look();
    window.addEventListener(WHO_EVENT, again);
    return () => {
      live = false;
      window.removeEventListener(WHO_EVENT, again);
    };
  }, [room]);

  if (!room || !news) return null;

  const days = restedDays(news);
  const rows = restedRows(news);

  return (
    <aside className={styles.rested} aria-label="Since you were last here">
      <p className={styles.columnName}>{restedHead(news.days)}</p>
      {days ? <p className={styles.restedLead}>{days}</p> : null}
      <ul className={styles.restedRows}>
        {rows.map((row, i) => (
          <li
            key={row.kind}
            className={styles.restedRow}
            /* Staggered the way the heads above arrive, so the column gains a
               block rather than having one appear in it. */
            style={{ animationDelay: `${80 + i * 70}ms` }}
          >
            <span className={styles.restedWell}>
              <Thing kind={row.kind} />
            </span>
            <span className={styles.restedText}>{row.text}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* THE GAME'S OWN OBJECTS. docs/DESIGN.md, the register: the product is shown
 * as working objects and the client's own icons are the ones to reach for
 * (Kacey, 2026-08-26 — the more of the game's own objects, the better).
 *
 * The pin wears the treasure map it wears everywhere else, straight off
 * PinChip so the two can never drift. The other two come off the same CDN
 * every item icon in the app comes off:
 *
 *   grouplooking — the game's own Looking For Group eye, which is the only
 *   vanilla icon that means *other players* without meaning a class or a
 *   faction. Who came through is a crowd, and a crowd has no class colour.
 *
 *   letter_15 — the mail. §3.3 already calls the in-app channel the envelope
 *   and calls WoW's mail icon the softest notification ever designed, so a
 *   reply waiting for you is the letter, said in the game's own hand. */

const ICON: Record<Exclude<RestedRow["kind"], "pins">, string> = {
  came: "inv_misc_grouplooking",
  answered: "inv_letter_15",
};

function Thing({ kind }: { kind: RestedRow["kind"] }) {
  if (kind === "pins") return <PinFace className={styles.restedFace} />;
  return (
    <img
      className={styles.restedFace}
      src={`https://render.worldofwarcraft.com/us/icons/56/${ICON[kind]}.jpg`}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
