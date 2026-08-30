"use client";

/* YOU, AT THE FOOT OF THE RAIL.
 *
 * The rail names 75 places and this names the one person looking at them. It
 * is the character-select row the game itself draws — the client's own race
 * portrait, the class disc on its shoulder, the name in the class colour, and
 * under it the sentence the character screen has printed since 2004: level,
 * race, class. Nothing here is redrawn (docs/CHARACTER.md); every mark is a
 * cell out of a 1.12 client, which is why nothing draws a frame around them.
 *
 * The class colour is the only colour in the column, so it is the thing the
 * eye lands on when it comes down the rail — a wash of it behind the portrait
 * and the name set in it, and that is the whole of the boldness spent.
 *
 * UNDER IT, THE DOOR. Discord is not required to use any of this and the strip
 * must not read as though it were (lib/auth.ts, COMMUNITY.md): signed out it
 * is a quiet offer with the reason attached, signed in it is a lit mark and a
 * name, and on a deploy with no door it is not drawn at all. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CLASS_NAME,
  RACE_NAME,
  classIcon,
  loadCharacter,
  racePortrait,
  type Character,
} from "@/lib/character";
import { CLASS_COLOR } from "@/lib/class-color";

import { enterWithDiscord } from "./enter";
import styles from "./shell.module.css";

/* Discord's own mark, from their brand kit — the same path the landing page
 * carries. Their door, their face. */
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

export default function You({
  handle,
  canSignIn,
}: {
  handle: string | null;
  canSignIn: boolean;
}) {
  const pathname = usePathname();

  /* `undefined` until the browser has been read. The plate holds its height
     through that first frame rather than popping in under the rail — the
     roster lives in localStorage and the server render cannot see it. */
  const [me, setMe] = useState<Character | null | undefined>(undefined);
  useEffect(() => setMe(loadCharacter()), [pathname]);

  return (
    <footer className={styles.railFoot}>
      {me === undefined ? (
        <span className={styles.mePlate} aria-hidden="true" />
      ) : me === null ? (
        <Link href="/you/new" className={`${styles.mePlate} ${styles.meEmpty}`}>
          <span className={styles.meSlot} />
          <span className={styles.meWords}>
            <span className={styles.meName}>Nobody yet</span>
            <span className={styles.meLine}>Make a character</span>
          </span>
        </Link>
      ) : (
        <Link
          href="/you"
          className={styles.mePlate}
          style={{ ["--cls" as string]: CLASS_COLOR[me.cls] }}
          aria-label={`${me.name}, level ${me.level} ${RACE_NAME[me.race]} ${CLASS_NAME[me.cls]}. Open your sheet.`}
        >
          <span className={styles.mePortrait}>
            <img src={racePortrait(me.race, me.sex)} alt="" decoding="async" />
            <img className={styles.meClass} src={classIcon(me.cls)} alt="" decoding="async" />
          </span>
          <span className={styles.meWords}>
            <span className={styles.meName}>{me.name}</span>
            <span className={styles.meLine}>
              {me.level} · {RACE_NAME[me.race]} {CLASS_NAME[me.cls]}
            </span>
          </span>
        </Link>
      )}

      {!canSignIn ? null : handle ? (
        <p
          className={`${styles.meDoor} ${styles.meDoorOn}`}
          title="Signed in with Discord. Your stars and plans follow you to any machine."
        >
          <Clyde />
          <span className={styles.meHandle}>{handle}</span>
        </p>
      ) : (
        <form action={enterWithDiscord} className={styles.meDoorForm}>
          <input type="hidden" name="back" value={pathname} />
          <button
            type="submit"
            className={styles.meDoor}
            title="Your stars and plans follow you to any machine. Nothing else changes."
          >
            <Clyde />
            <span className={styles.meHandle}>Sign in with Discord</span>
          </button>
        </form>
      )}
    </footer>
  );
}
