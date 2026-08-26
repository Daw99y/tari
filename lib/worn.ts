/* WORN → THIS. docs/DROPS.md step 3: one plain line of stat deltas.
 *
 * Client-safe: the shape of the item dictionary and the arithmetic between
 * two items. The dictionary itself (reference/items.json, every 1.12 item
 * in the plate's own fields) stays on the server behind /api/items — ten
 * thousand items do not ride the bundle for one comparison. */

import { GEAR_SLOTS } from "./character";
import type { Item, Quality } from "./loot";

/** One dictionary row: the plate's fields, abbreviated at rest. */
export type WornItem = {
  n: string;
  q: Quality | "Artifact";
  s: string;
  i: string | null;
  sc?: string;
  st?: [string, number][];
  dmg?: [number, number, number];
  a?: number;
  il?: number;
  rl?: number;
  d?: number;
  p?: number;
  b?: string | number;
  u?: number;
  e?: string[];
};

/** Which gear indices (slot id − 1) an item of this slot could replace. */
export function gearIndices(slot: string): number[] {
  switch (slot) {
    case "One-Hand":
      return [15, 16];
    case "Main Hand":
    case "Two-Hand":
      return [15];
    case "Off Hand":
    case "Held":
    case "Shield":
      return [16];
    case "Ranged":
    case "Thrown":
    case "Relic":
      return [17];
    case "Finger":
      return [10, 11];
    case "Trinket":
      return [12, 13];
    default: {
      const at = (GEAR_SLOTS as readonly string[]).findIndex(
        (s) => s.toLowerCase() === slot.toLowerCase()
      );
      return at === -1 ? [] : [at];
    }
  }
}

function dps(d?: [number, number, number]): number | null {
  if (!d || !d[2]) return null;
  return (d[0] + d[1]) / 2 / d[2];
}

/** The deltas, as parts: "+9 Agility", "−4 Spirit", "+1.2 DPS", "+31 Armor".
 *  Empty when the two have nothing measurable between them. */
export function deltaParts(worn: WornItem, item: Item): string[] {
  const parts: string[] = [];
  const sign = (v: number, unit: string, digits = 0) =>
    parts.push(`${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)} ${unit}`);

  const theirs = new Map<string, number>((worn.st ?? []).map(([t, v]) => [t, v]));
  const mine = new Map<string, number>(item.stats.map((s) => [s.type, s.value]));
  for (const [t, v] of mine) {
    const d = v - (theirs.get(t) ?? 0);
    if (d !== 0) sign(d, t);
  }
  for (const [t, v] of theirs) if (!mine.has(t) && v !== 0) sign(-v, t);

  const dm = item.damage ? (item.damage.min + item.damage.max) / 2 / item.damage.speed : null;
  const dt = dps(worn.dmg);
  if (dm !== null && dt !== null && Math.abs(dm - dt) >= 0.05) sign(dm - dt, "DPS", 1);
  else if (dm !== null && dt === null) sign(dm, "DPS", 1);

  const da = (item.armor ?? 0) - (worn.a ?? 0);
  if (da !== 0 && (item.armor != null || worn.a != null)) sign(da, "Armor");

  return parts;
}
