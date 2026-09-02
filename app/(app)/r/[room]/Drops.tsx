"use client";

/* THE SUMMONS. The corner holds an instrument now, not a card: the game's
 * own upgrade arrow — the green one every player already reads — redrawn
 * as our vector (§7.1: redraw the theme icons, rip only content), and since
 * the sheet's behind slots wear the same mark it lives in components/
 * UpArrow.tsx rather than here. The
 * compass opens the place; this opens what the place can do for you.
 * Hover breathes out a preview — the count, the faces, what is already
 * crossed off — and the press opens the kit, wearing the map's frame.
 *
 * The faces still answer a hover with the game's plate, because the corner
 * has always been where the reader idly asks "what is that". */

import { useEffect, useMemo, useState } from "react";

import { useDock } from "@/components/Dock";
import { ItemHover } from "@/components/ItemTooltip";
import UpArrow from "@/components/UpArrow";
import { loadCharacter, type Character } from "@/lib/character";
import { iconUrl, topQuality, type ClassId, type Item } from "@/lib/loot";
import { isOn, useMarks } from "@/lib/marks";
import { gearFrom } from "@/lib/plan";
import { rankOf, slotBeats } from "@/lib/upgrade";
import { useWornDict } from "@/lib/use-worn";

import styles from "./room.module.css";

export default function Drops({ drops, cls, level }: { drops: Item[]; cls: ClassId | null; level: number }) {
  const dock = useDock();
  const marks = useMarks();
  /* Read after mount: the server render has no localStorage, and a corner
     that guessed would flash someone else's ticks. */
  const [me, setMe] = useState<Character | null>(null);
  useEffect(() => setMe(loadCharacter()), []);
  const char = me?.key ?? null;

  /* THE JUDGE (lib/upgrade.ts, Kacey 2026-09-02): the arrow is a promise of
     upgrades, so with a character loaded the count holds only what beats the
     worn piece — the same gear and the same judge the rail and the path run.
     A reader with no character keeps the plain class-and-window count. */
  const gear = useMemo(() => gearFrom(marks, me), [marks, me]);
  const dict = useWornDict(me ? gear : []);
  const mine = me
    ? drops.filter((d) => slotBeats(gear, dict, d.slot, rankOf(d.quality), d.itemLevel, d.itemId))
    : drops;

  const found = (item: Item) => (char ? isOn(marks, char, "found", String(item.itemId)) : false);
  const open = mine.filter((d) => !found(d));
  const done = mine.length - open.length;
  const cleared = mine.length > 0 && done === mine.length;
  /* The room has drops, the judge let none through: a true state of its own,
     said plainly rather than drawn as a zero. */
  const beaten = me !== null && dict !== null && mine.length === 0 && drops.length > 0;
  const slots = new Set(mine.map((d) => d.slot)).size;
  /* The tally wears the best colour still on the table: the reader learns
     "how many" and "how good" in one look, without opening anything. */
  const best = topQuality(open);

  return (
    <aside className={styles.upgrades} aria-label="What drops here">
      <div className={styles.upWrap}>
        <button
          type="button"
          className={styles.up}
          aria-label={
            open.length > 0
              ? `Your kit — ${open.length} of ${mine.length} upgrades still to find here`
              : beaten
                ? "Your kit — nothing here beats what you are wearing"
                : `Your kit — all ${mine.length} drops crossed off here`
          }
          onClick={() => dock?.openKit()}
        >
          <span className={styles.upHalo} aria-hidden="true" />
          <UpArrow className={styles.upGlyph} />
          {open.length > 0 ? (
            <span className={styles.upCount} data-quality={best ?? undefined}>
              {open.length}
            </span>
          ) : null}
        </button>

        {/* The breath: what pressing it opens, in one glance. */}
        <div className={styles.upCard} role="group" aria-label="Drops here, at a glance">
          <p className={styles.upEyebrow}>Drops here</p>

          {cleared ? (
            <p className={styles.clearedLine}>
              <span className={styles.clearedStamp} aria-hidden="true">✓</span>
              All {mine.length} crossed off — for now. It moves when you do.
            </p>
          ) : beaten ? (
            <p className={styles.clearedLine}>
              Nothing here beats your kit — {drops.length} {drops.length === 1 ? "drop" : "drops"} still live inside.
            </p>
          ) : (
            <>
              <p className={styles.upFig}>
                {open.length}
                <span className={styles.upFigCap}>
                  {cls ? ` for a ${cls} at ${level}` : ` at ${level}`}
                </span>
              </p>
              <p className={styles.upSub}>
                {slots === 1 ? "one slot answered" : `${slots} slots answered`}
                {done > 0 ? ` · ${done} of ${mine.length} crossed off` : ""}
              </p>
            </>
          )}

          <span className={styles.upFaces}>
            {mine.map((item) => {
              const icon = iconUrl(item);
              return (
                <ItemHover
                  key={item.itemId}
                  item={item}
                  level={level}
                  focusable={false}
                  className={styles.upFace}
                >
                  <span className={styles.upIcon} data-found={found(item) || undefined}>
                    {icon ? <img src={icon} alt="" loading="lazy" draggable={false} /> : null}
                    {found(item) ? (
                      <svg className={styles.upTick} viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>
                </ItemHover>
              );
            })}
          </span>

          <p className={styles.upWord}>Press to lay them against your kit</p>
        </div>
      </div>
    </aside>
  );
}
