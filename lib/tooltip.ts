/* THE PLATE'S LINES. Ported from whelp plz (lib/item.ts, the tooltip
 * register) and typed against this repo's room files.
 *
 * Two voices on one card, and the rule between them is drawn in the CSS:
 * above it the game is talking — exact wording, because the plate is a
 * quotation and a quotation is either exact or wrong — and below it Tari
 * is, saying what the game's own tooltip never could: who drops it, how
 * often, and what that comes to in kills. */

import type { Faction } from "./types";
import { isFaction } from "./faction";
import type { Item, Source } from "./loot";

/* ---- above the rule: the game's words ---- */

export function itemLevelLine(item: Item): string | null {
  return item.itemLevel > 0 ? `Item Level ${item.itemLevel}` : null;
}

export function bindLine(item: Item): string | null {
  if (item.bind === "pickup") return "Binds when picked up";
  if (item.bind === "equip") return "Binds when equipped";
  return null;
}

/** The subclass, unless it says what the slot already said (a shield). */
export function subclassLine(item: Item): string | null {
  const sub = item.itemSubclass;
  if (!sub) return null;
  return sub.toLowerCase() === item.slot.toLowerCase() ? null : sub;
}

/** Hyphen, not the app's en dash: the game's own line. */
export function damageLine(item: Item): string | null {
  const d = item.damage;
  return d ? `${d.min} - ${d.max} Damage` : null;
}

export function speedLine(item: Item): string | null {
  const d = item.damage;
  return d ? `Speed ${d.speed.toFixed(2)}` : null;
}

/** Derived here, never carried, so it cannot disagree with the line above. */
export function dpsLine(item: Item): string | null {
  const d = item.damage;
  if (!d || d.speed <= 0) return null;
  return `(${((d.min + d.max) / 2 / d.speed).toFixed(2)} damage per second)`;
}

export function armorLine(item: Item): string | null {
  return typeof item.armor === "number" ? `${item.armor} Armor` : null;
}

/** "+10 Stamina" — number first, the game's order. */
export function statParts(item: Item): string[] {
  return item.stats.map((s) => `+${s.value} ${s.type}`);
}

/** One number in the file, two on the plate: an item not yet picked up is at full. */
export function durabilityLine(item: Item): string | null {
  return typeof item.durability === "number"
    ? `Durability ${item.durability} / ${item.durability}`
    : null;
}

export function requiredLevelLine(item: Item): string | null {
  return item.requiredLevel > 0 ? `Requires Level ${item.requiredLevel}` : null;
}

/** "Proficiency at 40" — Tari's one line above the rule; the game cannot say
 *  it. 0 means the field does not apply, 1 means trained from the start. */
export function proficiencyLine(item: Item, level: number): string | null {
  if (item.proficiencyLevel <= 1 || item.proficiencyLevel <= level) return null;
  return `Proficiency at ${item.proficiencyLevel}`;
}

/** g/s/c as numbers — the plate draws the units as coins, not letters.
 *  Leading zeros drop, middle zeros stay: 1g 0s 4c is not "1g 4c". */
export type Coin = { unit: "gold" | "silver" | "copper"; amount: number };

export function moneyCoins(copper: number): Coin[] {
  const coins: Coin[] = [
    { unit: "gold", amount: Math.floor(copper / 10000) },
    { unit: "silver", amount: Math.floor((copper % 10000) / 100) },
    { unit: "copper", amount: copper % 100 },
  ];
  const first = coins.findIndex((coin) => coin.amount > 0);
  return first <= 0 ? coins : coins.slice(first);
}

/* ---- below the rule: Tari's words ---- */

/** Expected kills at the stated rate. Quests have no grind to quantify. */
export function effortLine(source: Source): string | null {
  if (source.type === "quest") return null;
  if (typeof source.dropChance !== "number" || source.dropChance <= 0) return null;
  const kills = Math.round(100 / source.dropChance);
  return kills === 1 ? "~1 kill" : `~${kills} kills`;
}

/** What the creature is, in words — never a badge. */
export function riskWords(source: Source): string[] {
  const words: string[] = [];
  if (source.rare && source.elite) words.push("rare elite");
  else if (source.rare) words.push("rare");
  else if (source.elite) words.push("elite");
  if (source.instance) words.push("instance");
  return words;
}

/** A quest tuned within two levels of the reader is the quest they were
 *  doing anyway; from three out, its level changes the plan and is said. */
const QUEST_LEVEL_NOTE_FROM = 3;

export function oneSourceLine(source: Source, level: number): string {
  const parts = [source.sourceName, ...riskWords(source)];
  if (source.type === "quest") {
    parts[0] = `Reward from ${source.sourceName}`;
    if (
      typeof source.questLevel === "number" &&
      Math.abs(source.questLevel - level) >= QUEST_LEVEL_NOTE_FROM
    ) {
      parts.push(`level ${source.questLevel}`);
    }
  } else {
    if (typeof source.dropChance === "number") parts.push(`${source.dropChance}%`);
    const effort = effortLine(source);
    if (effort) parts.push(effort);
  }
  return parts.join("  ·  ");
}

/** Every source, one line each — the one place "+2 more" is expanded rather
 *  than counted. Still capped: a dozen creatures at one rate is a list with
 *  a count on the end, not a plate taller than the screen. */
const PLATE_SOURCES = 4;

export function sourceLines(item: Item, level: number): string[] {
  if (!item.sources.length) return ["Source unrecorded"];
  const shown = item.sources.slice(0, PLATE_SOURCES);
  const rest = item.sources.length - shown.length;
  const lines = shown.map((s) => oneSourceLine(s, level));
  if (rest) lines.push(rest === 1 ? "+1 more source" : `+${rest} more sources`);
  return lines;
}

/** The side an item keeps to, read off its quest sources. Drops are never
 *  gated — anyone can kill anything. Null says nothing, on purpose. */
export function exclusiveFaction(item: Item): Faction | null {
  for (const s of item.sources) {
    if (s.type === "quest" && isFaction(s.faction)) return s.faction;
  }
  return null;
}
