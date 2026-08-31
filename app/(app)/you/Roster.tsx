"use client";

/* THE CHARACTER SELECT, ON THE NAME.
 *
 * Kacey, 2026-08-31: switching character was a five-letter link in the bottom
 * corner of the sheet, and it did not switch anything — it walked you to the
 * creator, where the roster sat in a card below the fold. Two pages and a
 * scroll to answer "show me my other guy".
 *
 * So the roster came to the name. The name is already the biggest object on
 * the page and it is already the character; giving it a press is not a new
 * control, it is the one that was always implied. What falls out of it is the
 * game's own character-select row — the client's race portrait, the class
 * disc on its shoulder, the name in the class colour, and the sentence the
 * character screen has printed since 2004 under it. The same row the rail
 * draws at its foot (app/(app)/You.tsx), because there is one way this app
 * names a character and this is it.
 *
 * IT SWITCHES HERE. `selectCharacter` and the sheet re-reads: the doll, the
 * nineteen slots, the arrows and the corner are all downstream of one
 * `Character`, so the whole page turns over without a route change. That is
 * the point — a character select you have to navigate to is a settings page.
 *
 * THE TWO DOORS AT THE BOTTOM ARE NOT THE SAME DOOR. "Edit" opens the creator
 * on whoever is in play; "New character" opens it empty (?fresh). Before this
 * they were one link that guessed, and the guess was always "edit". */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  CLASS_NAME,
  RACE_NAME,
  classIcon,
  loadRoster,
  racePortrait,
  selectCharacter,
  type Character,
} from "@/lib/character";
import { CLASS_COLOR } from "@/lib/class-color";

import styles from "./sheet.module.css";

export default function Roster({
  me,
  onPick,
}: {
  me: Character;
  onPick: (c: Character) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<Character[]>([]);

  /* Read on arrival and again each time the panel opens — a character can be
     made or dropped in the creator while this page is still mounted. */
  useEffect(() => {
    setMine(loadRoster());
  }, [open, me.key]);

  /* The room's contract for anything that opens over the art: Escape, or a
     press anywhere that is not this. */
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      setOpen(false);
    };
    window.addEventListener("keydown", away);
    window.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("keydown", away);
      window.removeEventListener("pointerdown", away);
    };
  }, [open]);

  /* Closing must not drop the reader off the top of the page. */
  const press = useRef<HTMLButtonElement>(null);
  const held = useRef(false);
  useEffect(() => {
    if (held.current && !open && document.activeElement === document.body) press.current?.focus();
    held.current = open;
  }, [open]);

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  const pick = (c: Character) => {
    setOpen(false);
    if (c.key === me.key) return;
    onPick(selectCharacter(c.key) ?? c);
  };

  const others = mine.filter((c) => c.key !== me.key).length;

  return (
    <div className={styles.who} onPointerDown={stop}>
      <p className={styles.line}>
        Level {me.level} {RACE_NAME[me.race]} {CLASS_NAME[me.cls]}
        {me.realm ? <span className={styles.realm}> · {me.realm}</span> : null}
        {me.guild ? <span className={styles.realm}> · &lt;{me.guild}&gt;</span> : null}
      </p>

      <button
        ref={press}
        type="button"
        className={styles.whoPress}
        style={{ ["--cls" as string]: CLASS_COLOR[me.cls] }}
        aria-expanded={open}
        aria-label={
          others
            ? `${me.name}. Switch character — ${others} ${others === 1 ? "other" : "others"} saved.`
            : `${me.name}. Switch character.`
        }
        onClick={() => setOpen((was) => !was)}
      >
        <span className={styles.whoFace} aria-hidden="true">
          <img src={racePortrait(me.race, me.sex)} alt="" decoding="async" draggable={false} />
          <img className={styles.whoClass} src={classIcon(me.cls)} alt="" decoding="async" draggable={false} />
        </span>
        <h1 className={styles.name}>{me.name}</h1>
        <span className={styles.whoCaret} aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className={styles.crewPanel}>
          <p className={styles.crewHead}>Your characters</p>
          <ul className={styles.crewList}>
            {mine.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  className={styles.crew}
                  data-on={c.key === me.key || undefined}
                  style={{ ["--cls" as string]: CLASS_COLOR[c.cls] }}
                  aria-pressed={c.key === me.key}
                  onClick={() => pick(c)}
                >
                  <span className={styles.crewFace} aria-hidden="true">
                    <img src={racePortrait(c.race, c.sex)} alt="" decoding="async" draggable={false} />
                    <img className={styles.crewClass} src={classIcon(c.cls)} alt="" decoding="async" draggable={false} />
                  </span>
                  <span className={styles.crewText}>
                    <span className={styles.crewName}>{c.name}</span>
                    <span className={styles.crewLine}>
                      {c.level} · {RACE_NAME[c.race]} {CLASS_NAME[c.cls]}
                      {c.realm ? ` · ${c.realm}` : ""}
                    </span>
                  </span>
                  <span className={styles.crewMark} aria-hidden="true">
                    {c.key === me.key ? "Playing" : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.crewFoot}>
            <Link href="/you/new" className={styles.crewDoor}>
              Edit {me.name}
            </Link>
            <Link href="/you/new?fresh=1" className={`${styles.crewDoor} ${styles.crewAdd}`}>
              New character
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
