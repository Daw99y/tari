/* WHAT DROPS HERE. docs/TARI.md §4.3 #7: a panel, never a list across zones.
 *
 * Reads the room files scripts/rooms-from-zones.py emits — one per room,
 * every class folded in, each item saying which classes it came from. The
 * reader's class and level narrow it; nothing here knows about any other
 * room, which is what keeps the panel from becoming a route. */

import { LOOT_FILES } from "./loot-files";

export type ClassId =
  | "warrior"
  | "hunter"
  | "rogue"
  | "mage"
  | "warlock"
  | "priest"
  | "paladin"
  | "shaman"
  | "druid";

export const CLASSES: ClassId[] = ["warrior", "hunter", "rogue", "mage", "warlock", "priest", "paladin", "shaman", "druid"];

export function isClassId(v: string | undefined): v is ClassId {
  return !!v && (CLASSES as string[]).includes(v);
}

export type Quality = "Poor" | "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type Source = {
  type: "drop" | "quest";
  sourceId: number;
  sourceName: string;
  instance: boolean;
  instanceName?: string;
  /* Drop only. */
  dropChance?: number;
  sourceLevel?: { min: number; max: number };
  boss?: boolean;
  rare?: boolean;
  elite?: boolean;
  lootPath?: "direct" | "reference";
  endgame?: boolean;
  /* Quest only. `questLevel` is the tuning; `minLevel` the accept gate. */
  questLevel?: number;
  minLevel?: number;
  faction?: "alliance" | "horde" | "both";
};

export type Item = {
  itemId: number;
  name: string;
  iconName: string | null;
  wowheadUrl: string;
  slot: string;
  itemSubclass?: string;
  quality: Quality;
  /* The plate's fields (lib/tooltip.ts). All present in every room file
   * except where the game itself has nothing to say. */
  bind: "pickup" | "equip" | null;
  unique?: boolean;
  stats: { type: string; value: number }[];
  damage?: { min: number; max: number; speed: number };
  armor?: number;
  effects?: string[];
  durability?: number;
  sellPriceCopper: number;
  proficiencyLevel: number;
  archetype: string;
  availableAtLevel: number;
  requiredLevel: number;
  itemLevel: number;
  sources: Source[];
  /** Which classes' files this item appeared in. */
  classes: ClassId[];
  /** How the pipeline filed it: a story drop, a zone exclusive, or instance loot. */
  bucket: "drop" | "exclusive" | "instance";
};

export type LootFile = {
  room: string;
  name: string;
  band: { min: number; max: number } | null;
  items: Item[];
  worldDrops: { count: number; levelRange: { min: number; max: number } } | null;
};

export function lootFor(roomId: string): LootFile | undefined {
  return LOOT_FILES[roomId];
}

/* The window, as whelp plz drew it: five below, three above. */
export const WINDOW_BELOW = 5;
export const WINDOW_ABOVE = 3;
export const PANEL_CEILING = 8;

const QUALITY_RANK: Record<Quality, number> = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1, Poor: 0 };

export function byRank(a: Item, b: Item): number {
  return QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality] || b.itemLevel - a.itemLevel || a.name.localeCompare(b.name);
}

/** The panel's rows: for this class if one is given, in the window around
    this level, best first, capped. */
export function panelFor(file: LootFile, cls: ClassId | null, level: number): Item[] {
  return file.items
    .filter((i) => !cls || i.classes.includes(cls))
    .filter((i) => i.availableAtLevel >= level - WINDOW_BELOW && i.availableAtLevel <= level + WINDOW_ABOVE)
    .sort(byRank)
    .slice(0, PANEL_CEILING);
}

/** Where the reader stands when the URL does not say: the middle of the band. */
export function defaultLevel(file: LootFile): number {
  if (!file.band) return 60;
  return Math.round((file.band.min + file.band.max) / 2);
}

export function clampLevel(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 60 ? n : fallback;
}

export function iconUrl(item: Pick<Item, "iconName">): string | null {
  return item.iconName ? `https://render.worldofwarcraft.com/us/icons/56/${item.iconName}.jpg` : null;
}

/** The one line under a name: the best source, and its odds if it has them. */
export function sourceLine(item: Item): string {
  const s = [...item.sources].sort((a, b) => (b.dropChance ?? 100) - (a.dropChance ?? 100))[0];
  if (!s) return "";
  if (s.type === "quest") return `Quest · ${s.sourceName}`;
  const odds = s.dropChance != null ? ` · ${s.dropChance >= 10 ? Math.round(s.dropChance) : s.dropChance.toFixed(1)}%` : "";
  return `${s.sourceName}${odds}`;
}
