/* A DICTIONARY ROW, AS THE PLATE READS IT.
 *
 * `reference/items.json` holds every 1.12 item in the plate's own fields,
 * abbreviated (lib/worn.ts, `WornItem`). `components/ItemTooltip.tsx` reads
 * the room's `Item`, which is the same facts spelled out plus where the thing
 * comes from. The sheet has the first and needs the second, so this is the
 * one place the two are joined.
 *
 * WHAT IS MISSING IS MISSING HONESTLY. `sources` is empty and stays empty:
 * the sheet is not holding a room's loot file and never will (lib/drops-here.ts
 * has the argument — 75 files and 2,320 items to draw a popover). So a plate
 * built here is asked for `quiet`, which drops Tari's half rather than
 * printing "Source unrecorded" over an item the pipeline knows perfectly well
 * where to find. The door on the row is what answers that question.
 */

import { iconUrl, type Item, type Quality } from "./loot";
import { WARDROBE, type Item as WardrobeItem } from "./wardrobe";
import type { WornItem } from "./worn";

const QUALITIES: Quality[] = ["Poor", "Common", "Uncommon", "Rare", "Epic", "Legendary"];

export function plateItem(itemId: number, row: WornItem): Item {
  return {
    itemId,
    name: row.n,
    iconName: row.i,
    wowheadUrl: `https://www.wowhead.com/classic/item=${itemId}`,
    slot: row.s,
    itemSubclass: row.sc,
    quality: QUALITIES.includes(row.q as Quality) ? (row.q as Quality) : "Legendary",
    bind: row.b === "pickup" || row.b === "equip" ? row.b : null,
    unique: row.u ? true : undefined,
    stats: (row.st ?? []).map(([type, value]) => ({ type, value })),
    damage: row.dmg ? { min: row.dmg[0], max: row.dmg[1], speed: row.dmg[2] } : undefined,
    armor: row.a,
    effects: row.e,
    durability: row.d,
    sellPriceCopper: row.p ?? 0,
    proficiencyLevel: 0,
    archetype: "",
    availableAtLevel: row.rl ?? 0,
    requiredLevel: row.rl ?? 0,
    itemLevel: row.il ?? 0,
    sources: [],
    classes: [],
    bucket: "drop",
  };
}


/* --------------------------------------------------------------------------
   ONE ROW'S WORTH OF AN ITEM.

   The sheet's rows come from two places and both are half an answer. The
   wardrobe catalogue knows what a thing *looks like* — it is the reason the
   doll can wear it — and the dictionary knows what it *is*. Most items are in
   both. Some are in only one: a druid's idol, a paladin's libram and a
   shaman's totem have no art in the catalogue at all, because the client
   never draws them on a character, and before this the third slot's drawer
   said "nothing here the wardrobe can draw yet" and offered a reader nothing.

   So a row is named from whichever half has it, and only the catalogue half
   can be hung on the figure. That is the honest split: the doll draws what it
   has art for, and the sheet lists what exists.
-------------------------------------------------------------------------- */

export type RowItem = {
  entry: number;
  name: string;
  /** Index into lib/doll's QUALITY. */
  quality: number;
  /** A whole URL, from whichever store this row came out of. */
  icon: string | null;
  itemLevel: number;
  /** The catalogue has art for it, so the figure can wear it. */
  drawable: boolean;
};

export function rowFromWardrobe(item: WardrobeItem): RowItem {
  return {
    entry: item.entry,
    name: item.name,
    quality: item.quality,
    icon: item.icon ? `${WARDROBE}/icons/${item.icon}` : null,
    itemLevel: item.itemLevel,
    drawable: true,
  };
}

export function rowFromPlate(entry: number, row: WornItem): RowItem {
  return {
    entry,
    name: row.n,
    quality: Math.max(0, QUALITIES.indexOf(row.q as Quality)),
    icon: iconUrl({ iconName: row.i }),
    itemLevel: row.il ?? 0,
    drawable: false,
  };
}
