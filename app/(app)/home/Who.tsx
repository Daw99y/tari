"use client";

/* WHO YOU ARE — the second column. docs/DIRECTION.md §3.
 *
 * IT IS NOT A SECOND CHARACTER SHEET, AND THAT WAS THE QUESTION WORTH ASKING.
 * `/you` already draws the paperdoll: nineteen slots, a live .m2 of the
 * character wearing them, the plate on every hover. Rebuilding a narrower copy
 * of that here would put two paperdolls in one product, and the moment they
 * disagreed the reader would have to work out which one was lying. So this
 * column names the character, answers the one question the judge exists to
 * answer, prints the campfire's letter, and is three doors: the sheet, the
 * campfire, and the kit.
 *
 * THE JUDGE IS lib/upgrade.ts AND NOTHING ELSE (docs/DROPS.md). One opinion
 * about two items, held in one file, so the arrow here and the arrow in the
 * room mean the same thing. Until the worn dictionary lands the count is null
 * rather than zero — half a judgement drawn now and corrected a beat later is
 * the app accusing slots at random.
 *
 * A CLIENT COMPONENT, because the character lives in localStorage and the
 * roster switches in place (lib/character.ts, WHO_EVENT). The server has the
 * class and the level off the cookie; it does not have the name, the guild or
 * the gear, and it should not.
 *
 * SIGNED OUT IS NOT EMPTY. §Scope: a reader without an account still has a
 * character on this browser, so the column draws it and offers the door at the
 * foot rather than putting a login wall over the middle of the screen. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CLASS_NAME,
  RACE_NAME,
  classIcon,
  loadCharacter,
  racePortrait,
  WHO_EVENT,
  type Character,
} from "@/lib/character";
import { CLASS_COLOR } from "@/lib/class-color";
import { marksNow, isOn } from "@/lib/marks";
import { letter, readPath } from "@/lib/path";
import { gearOf } from "@/lib/plan";
import { useWornDict } from "@/lib/use-worn";

import { enterWithDiscord } from "../enter";
import styles from "./home.module.css";

export default function Who({ handle, canSignIn }: { handle: string | null; canSignIn: boolean }) {
  const [me, setMe] = useState<Character | null>(null);
  const pathname = usePathname();

  /* Read on mount and again whenever the roster switches under us. */
  useEffect(() => {
    const read = () => setMe(loadCharacter());
    read();
    window.addEventListener(WHO_EVENT, read);
    return () => window.removeEventListener(WHO_EVENT, read);
  }, []);

  const gear = useMemo(() => gearOf(me), [me]);
  const dict = useWornDict(gear);

  /* The letter, exactly as the campfire prints it (lib/path.ts). Two sources
     of the same sentence would be two sentences within a week. */
  const lines = useMemo(() => {
    if (!me || !dict) return null;
    const store = marksNow();
    const path = readPath(gear, dict, me.cls, me.level, (id) => isOn(store, me.key, "found", String(id)));
    return letter(path);
  }, [me, dict, gear]);

  if (!me) {
    return (
      <section className={styles.column} aria-label="Who you are">
        <p className={styles.empty}>Make a character and this column fills in.</p>
        <Link href="/you/new" className={styles.door}>
          Make one
        </Link>
      </section>
    );
  }

  const ink = CLASS_COLOR[me.cls];

  return (
    <section className={styles.column} aria-label="Who you are">
      <div className={styles.who} style={{ ["--class" as string]: ink }}>
        <img className={styles.portrait} src={racePortrait(me.race, me.sex)} alt="" draggable={false} />
        <div className={styles.whoInk}>
          <p className={styles.whoName}>{me.name}</p>
          <p className={styles.whoLine}>
            Level {me.level} {RACE_NAME[me.race]} {CLASS_NAME[me.cls]}
          </p>
          {me.guild ? <p className={styles.whoGuild}>&lt;{me.guild}&gt;</p> : null}
        </div>
        <img className={styles.classDisc} src={classIcon(me.cls)} alt="" draggable={false} />
      </div>

      <div className={styles.block}>
        <p className={styles.blockName}>From the campfire</p>
        {lines === null ? (
          /* No dictionary yet, so no judgement yet — see the header. */
          <p className={styles.empty}>Reading what you are wearing.</p>
        ) : lines.length === 0 ? (
          <p className={styles.empty}>Your gear has kept up with your level.</p>
        ) : (
          <ul className={styles.letter}>
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      <nav className={styles.doors} aria-label="Your pages">
        <Link href="/you" className={styles.door} prefetch>
          The sheet
        </Link>
        <Link href="/campfire" className={styles.door} prefetch>
          The campfire
        </Link>
        <Link href="/kit" className={styles.door} prefetch>
          The kit
        </Link>
      </nav>

      {canSignIn && handle === null ? (
        <div className={styles.offer}>
          {/* The same server action the rail's foot posts to, with the same
              hidden field, so a sign-in from here comes back to here. */}
          <form action={enterWithDiscord}>
            <input type="hidden" name="back" value={pathname} />
            <button type="submit" className={styles.offerButton}>
              Sign in with Discord
            </button>
          </form>
          <p className={styles.offerWhy}>
            Keeps this character, and what you leave in rooms, on every device you read from.
          </p>
        </div>
      ) : null}
    </section>
  );
}
