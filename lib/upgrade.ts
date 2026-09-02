/**
 * THE JUDGE. Kacey, 2026-09-02: the green arrow is the one colour every
 * player reads as "better than what you have" (docs/DROPS.md), and every
 * counting surface was drawing it on anything in the level window — a green
 * quest hat over Eye of Rend, a green blade over a Krol Blade, the very item
 * the armory import says you are wearing. This file is the one opinion the
 * app is allowed to hold about two items, so every surface holds the same one.
 *
 * THE PRICE IS QUALITY AND ITEM LEVEL, NOTHING FINER. Stat weights per class
 * per build is a theorycraft site, and the rail has six numbers per item to
 * count with. A quality step is worth QUALITY_STEP item levels — calibrated
 * against 1.12's own budgets, where a green needs ~13 levels on a blue to
 * match it. The kit still prints the honest stat deltas next to anything the
 * judge lets through; the judge only decides what may wear the arrow.
 *
 * TIES LOSE. An equal price is not an upgrade, and the item you are already
 * wearing is not an upgrade twice over — it is refused by id before it is
 * priced at all.
 */

import { DROP_SLOTS, type DropRow } from "./room-drops";
import { gearIndices, type WornItem } from "./worn";

/** What one quality step buys, in item levels. */
export const QUALITY_STEP = 13;

/* The dictionary speaks quality names; rows speak DROP_QUALITIES ranks.
   Artifact prices above Legendary and never loses to anything. */
const WORN_RANK: Record<string, number> = {
  Poor: 0, Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5, Artifact: 6,
};

/** One item's price: item level plus what its colour is worth. */
export function worth(qualityRank: number, itemLevel: number): number {
  return itemLevel + QUALITY_STEP * qualityRank;
}

export function wornWorth(worn: WornItem): number {
  return worth(WORN_RANK[worn.q] ?? 1, worn.il ?? worn.rl ?? 0);
}

/**
 * Does a candidate beat the worn piece? An empty slot loses to everything;
 * the worn item never beats itself; otherwise strictly higher price wins.
 */
export function beats(
  qualityRank: number,
  itemLevel: number,
  itemId: number,
  worn: WornItem | null | undefined,
  wornId: number,
): boolean {
  if (!wornId) return true;
  /* Worn but not yet priced — a dictionary row that has not landed is not a
     licence to call everything an upgrade. */
  if (!worn || itemId === wornId) return false;
  return worth(qualityRank, itemLevel) > wornWorth(worn);
}

/** The row's colour, from the dictionary's name for it. */
export function rankOf(quality: string): number {
  return WORN_RANK[quality] ?? 1;
}

/* The two hands, for the two-hander rule below. */
const MAIN_HAND = 15;
const OFF_HAND = 16;

/**
 * Does an item beat what this character has in the slots it could fill?
 *
 * THE WEAKER OF A PAIR IS THE BAR (Kit.tsx said it first): a Finger item
 * beats the slot if it beats your weaker ring, a One-Hand item your weaker
 * hand. A two-hander stands in both hands, so the off hand it empties is
 * priced as the two-hander rather than as a gap.
 *
 * NO DICTIONARY, NO JUDGEMENT. Until the worn rows land, nothing is judged
 * an upgrade — the same rule readPath already lives by: half a judgement
 * drawn now and corrected a beat later is the app accusing slots at random.
 * A reader with no character gets no judge at all and keeps the plain
 * class-and-window count; that is the caller's branch, not this one's.
 */
export function slotBeats(
  gear: number[],
  dict: Record<string, WornItem> | null,
  slot: string,
  qualityRank: number,
  itemLevel: number,
  itemId: number,
): boolean {
  if (!dict) return false;
  const twoHander = dict[String(gear[MAIN_HAND] ?? 0)]?.s === "Two-Hand";
  for (const at of gearIndices(slot)) {
    const id = at === OFF_HAND && twoHander ? (gear[MAIN_HAND] ?? 0) : (gear[at] ?? 0);
    if (beats(qualityRank, itemLevel, itemId, id ? dict[String(id)] : null, id)) return true;
  }
  return false;
}

/** The judge as the counting surfaces hold it: slotBeats over drop rows,
 *  bound to what this character wears. */
export function judgeFor(
  gear: number[],
  dict: Record<string, WornItem> | null,
): (row: DropRow) => boolean {
  return (row: DropRow) => slotBeats(gear, dict, DROP_SLOTS[row[3]] ?? "", row[4], row[5], row[0]);
}
