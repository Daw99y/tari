"use client";

/* THE KIT. The upgrade surface, at the size the question deserves.
 *
 * The corner card is a summons now; this is what it summons. The middle of
 * the canvas — the stage's third subject — lays the room's answers against
 * the reader's own slots: what you swing, what you wear, what this place
 * offers for each, at what odds, and what the trade is worth. Slot-first,
 * because the reader's question is "what am I missing", and the map already
 * answers "where".
 *
 * STILL A ROOM'S CARD. Nothing here reaches past this room — a slot with no
 * answer here simply is not a row. The kit can never become the shopping
 * list §2.1 refuses, because it is bolted to the place.
 *
 * THE JUDGE SPLITS THE ROOM (lib/upgrade.ts, Kacey 2026-09-02): the headline
 * only promises what beats the worn piece. Everything else the room drops
 * sinks to a quiet list below — still a fact, still tickable, never counted
 * and never wearing the arrow's green.
 *
 * Hover is the plate, press is the stage, the picture is the found tick,
 * the star hunts — the same four gestures as everywhere else. */

import { useEffect, useMemo, useState } from "react";

import { useDock } from "@/components/Dock";
import { ItemHover } from "@/components/ItemTooltip";
import SlotGlyph from "@/components/SlotGlyph";
import WishStar from "@/components/WishStar";
import { loadCharacter, type Character } from "@/lib/character";
import { bestSource } from "@/lib/hunt";
import { iconUrl, sourceLine, type ClassId, type Item } from "@/lib/loot";
import { isOn, setMark, useMarks } from "@/lib/marks";
import { gearFrom, planKey } from "@/lib/plan";
import { rankOf, slotBeats } from "@/lib/upgrade";
import { useWornDict } from "@/lib/use-worn";
import { deltaParts, gearIndices, type WornItem } from "@/lib/worn";

import styles from "./kit.module.css";

/** The sheet's own march: weapons, then armour head-to-foot, then jewelry. */
const SLOT_ORDER = [
  "Main Hand", "One-Hand", "Two-Hand", "Off Hand", "Shield", "Held", "Ranged", "Thrown",
  "Head", "Shoulder", "Back", "Chest", "Wrist", "Hands", "Waist", "Legs", "Feet",
  "Neck", "Finger", "Trinket",
];

type SlotRow = { slot: string; items: Item[]; worn: WornItem | null; bare: boolean };

export default function Kit({
  drops,
  cls,
  level,
  room,
}: {
  drops: Item[];
  cls: ClassId | null;
  level: number;
  room: string;
}) {
  const dock = useDock();
  const marks = useMarks();
  const [me, setMe] = useState<Character | null>(null);
  const char = me?.key ?? null;
  useEffect(() => setMe(loadCharacter()), []);

  /* What the character is wearing, the dressing room's plan included
     (docs/DRESSING.md): there is one character and it wears what the reader
     told it to, and a plan that lands mid-session reaches these rows.
     Held by the plan's signature, not the store — see lib/plan.ts. */
  const key = planKey(marks, char);
  const gear = useMemo(() => gearFrom(marks, me), [me, key]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The dictionary rows for what the character wears in the slots this room
     answers — one shared fetch (lib/use-worn.ts). Null until it lands; the
     judge refuses to judge without it. */
  const wornIds = useMemo(
    () =>
      drops
        .flatMap((d) => gearIndices(d.slot))
        .map((i) => gear[i])
        .filter((id): id is number => typeof id === "number" && id > 0),
    [drops, gear]
  );
  const dict = useWornDict(wornIds);

  const found = (item: Item) => (char ? isOn(marks, char, "found", String(item.itemId)) : false);
  const wished = (item: Item) => (char ? isOn(marks, char, "wish", String(item.itemId)) : false);

  /* One row per slot the room answers, in the sheet's order. The worn piece
     is the weaker of a pair — the honest bar. The judge splits each slot:
     what beats the worn piece stands in the rows the headline counts, the
     rest sinks to the quiet list. Until there is a character and the worn
     rows have landed, nothing is judged and the room reads as it always
     did — a fact about the place. */
  const ready = char !== null && dict !== null;
  const sink = (items: Item[]) =>
    [...items].sort((a, b) => Number(found(a)) - Number(found(b)) || Number(wished(b)) - Number(wished(a)));
  const rows: SlotRow[] = [];
  const quiet: SlotRow[] = [];
  for (const slot of SLOT_ORDER) {
    const all = drops.filter((d) => d.slot === slot);
    if (all.length === 0) continue;
    const ids = gearIndices(slot)
      .map((i) => gear[i])
      .filter((id): id is number => typeof id === "number" && id > 0);
    const wornRows = dict ? ids.map((id) => dict[id]).filter(Boolean) : [];
    wornRows.sort((a, b) => (a.il ?? 0) - (b.il ?? 0));
    const ups = ready
      ? all.filter((d) => slotBeats(gear, dict, d.slot, rankOf(d.quality), d.itemLevel, d.itemId))
      : all;
    const rest = ready ? all.filter((d) => !ups.includes(d)) : [];
    const base = {
      slot,
      worn: wornRows[0] ?? null,
      bare: char !== null && gear.length > 0 && ids.length === 0,
    };
    if (ups.length > 0) rows.push({ ...base, items: sink(ups) });
    if (rest.length > 0) quiet.push({ ...base, items: sink(rest) });
  }

  const done = drops.filter(found).length;

  const slotRow = (r: SlotRow, dim: boolean) => (
    <li key={(dim ? "also-" : "") + r.slot} className={styles.row} data-quiet={dim || undefined}>
      <div className={styles.slot}>
        <SlotGlyph slot={r.slot} className={styles.slotGlyph} />
        <span className={styles.slotName}>{r.slot}</span>
      </div>

      <div className={styles.wearing}>
        <span className={styles.wearK}>wearing</span>
        {r.worn ? (
          <span className={styles.wearV} data-quality={r.worn.q}>
            {r.worn.n}
          </span>
        ) : (
          <span className={styles.wearNone}>{r.bare ? "nothing yet" : "—"}</span>
        )}
      </div>

      <ol className={styles.offers}>
        {r.items.map((item) => (
          <Offer
            key={item.itemId}
            item={item}
            worn={r.worn}
            level={level}
            char={char}
            found={found(item)}
            wished={wished(item)}
          />
        ))}
      </ol>
    </li>
  );

  return (
    <div className={styles.kit}>
      <header className={styles.head}>
        <div className={styles.said}>
          <p className={styles.eyebrow}>Your kit · in this room</p>
          <h2 className={styles.title}>
            {rows.length === 0
              ? `Nothing in ${room} beats your kit`
              : `${room} answers ${rows.length === 1 ? "one slot" : `${rows.length} of your slots`}`}
          </h2>
          <p className={styles.sub}>
            {cls ? `For a ${cls} at ${level}` : `At ${level}`}
            {done > 0 ? ` · ${done} of ${drops.length} crossed off` : ""}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={() => dock?.close()}>
          Close
          <span className={styles.esc} aria-hidden="true">esc</span>
        </button>
      </header>

      <ol className={styles.rows}>
        {rows.map((r) => slotRow(r, false))}
        {quiet.length > 0 ? (
          <li key="also" className={styles.alsoHead}>
            <p className={styles.alsoTitle}>Also drops here</p>
            <p className={styles.alsoSub}>None of it beats what you&rsquo;re wearing — ticks and stars still work.</p>
          </li>
        ) : null}
        {quiet.map((r) => slotRow(r, true))}
      </ol>
    </div>
  );
}

function Offer({
  item,
  worn,
  level,
  char,
  found,
  wished,
}: {
  item: Item;
  worn: WornItem | null;
  level: number;
  char: string | null;
  found: boolean;
  wished: boolean;
}) {
  const dock = useDock();
  const icon = iconUrl(item);
  const id = String(item.itemId);
  const s = bestSource(item);
  const parts = worn ? deltaParts(worn, item) : [];
  const trade = worn
    ? parts.length > 0
      ? parts.join("  ·  ")
      : "an even trade"
    : s?.type === "quest"
      ? ""
      : "";

  return (
    <li className={styles.offer} data-found={found || undefined}>
      {char ? (
        <button
          type="button"
          className={styles.tick}
          aria-pressed={found}
          aria-label={found ? `${item.name}: found — take the tick back` : `${item.name}: mark found`}
          onClick={() => setMark(char, "found", id, !found)}
        >
          <ItemHover item={item} level={level} focusable={false} className={styles.icon}>
            {icon ? <img src={icon} alt="" loading="lazy" draggable={false} /> : null}
            {found ? (
              <svg className={styles.tickMark} viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </ItemHover>
        </button>
      ) : (
        <ItemHover item={item} level={level} focusable={false} className={styles.icon}>
          {icon ? <img src={icon} alt="" loading="lazy" draggable={false} /> : null}
        </ItemHover>
      )}

      <button type="button" className={styles.offerDoor} onClick={() => dock?.openItem(item)}>
        <span className={styles.offerName} data-quality={item.quality}>
          {item.name}
        </span>
        <span className={styles.offerSource}>{sourceLine(item)}</span>
        {trade ? <span className={styles.offerTrade}>{trade}</span> : null}
      </button>

      {char ? (
        <button
          type="button"
          className={styles.wish}
          aria-pressed={wished}
          aria-label={wished ? `${item.name}: stop hunting` : `${item.name}: hunt this`}
          onClick={() => setMark(char, "wish", id, !wished)}
        >
          <WishStar on={wished} />
        </button>
      ) : null}
    </li>
  );
}
