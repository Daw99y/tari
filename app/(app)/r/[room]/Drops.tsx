"use client";

/* THE SUMMONS. The corner holds an instrument now, not a card: the game's
 * own upgrade arrow — the green one every player already reads — redrawn
 * as our vector (§7.1: redraw the theme icons, rip only content). The
 * compass opens the place; this opens what the place can do for you.
 * Hover breathes out a preview — the count, the faces, what is already
 * crossed off — and the press opens the kit, wearing the map's frame.
 *
 * The faces still answer a hover with the game's plate, because the corner
 * has always been where the reader idly asks "what is that". */

import { useEffect, useState } from "react";

import { useDock } from "@/components/Dock";
import { ItemHover } from "@/components/ItemTooltip";
import { loadCharacter } from "@/lib/character";
import { iconUrl, topQuality, type ClassId, type Item } from "@/lib/loot";
import { isOn, useMarks } from "@/lib/marks";

import styles from "./room.module.css";

export default function Drops({ drops, cls, level }: { drops: Item[]; cls: ClassId | null; level: number }) {
  const dock = useDock();
  const marks = useMarks();
  /* Read after mount: the server render has no localStorage, and a corner
     that guessed would flash someone else's ticks. */
  const [char, setChar] = useState<string | null>(null);
  useEffect(() => setChar(loadCharacter()?.key ?? null), []);

  const found = (item: Item) => (char ? isOn(marks, char, "found", String(item.itemId)) : false);
  const open = drops.filter((d) => !found(d));
  const done = drops.length - open.length;
  const cleared = drops.length > 0 && done === drops.length;
  const slots = new Set(drops.map((d) => d.slot)).size;
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
              ? `Your kit — ${open.length} of ${drops.length} drops still to find here`
              : `Your kit — all ${drops.length} drops crossed off here`
          }
          onClick={() => dock?.openKit()}
        >
          <span className={styles.upHalo} aria-hidden="true" />
          <svg className={styles.upGlyph} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.4 20.4 11.2 H15.6 V19.8 Q15.6 21.4 14 21.4 H10 Q8.4 21.4 8.4 19.8 V11.2 H3.6 Z"
              fill="currentColor"
              stroke="rgba(4, 10, 5, 0.55)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
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
              All {drops.length} crossed off — for now. It moves when you do.
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
                {done > 0 ? ` · ${done} of ${drops.length} crossed off` : ""}
              </p>
            </>
          )}

          <span className={styles.upFaces}>
            {drops.map((item) => {
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
