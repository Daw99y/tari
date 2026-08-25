/* THE CHARACTER. docs/CHARACTER.md: you are your character.
 *
 * One type, one place it lives signed out (localStorage), and the game's
 * own tables — who can be what, and where each race wakes up. Signed in,
 * the same object goes to `characters` through the sync push. */

import type { ClassId } from "./loot";
import type { Look } from "./use-body";

export type Character = {
  key: string;
  name: string;
  realm: string | null;
  race: number;
  sex: 0 | 1;
  cls: ClassId;
  faction: "alliance" | "horde";
  level: number;
  look: Look;
  gear: number[];
  importedAt: string | null;
  /** What else the import said, for the sheet. Absent on a created body. */
  guild?: string | null;
  played?: number | null;
  copper?: number | null;
  hearth?: string | null;
  zone?: string | null;
  professions?: { name: string; rank: number }[];
};

/** WoW's 19 inventory slots, by index in `gear` (slot id − 1). */
export const GEAR_SLOTS = [
  "Head", "Neck", "Shoulder", "Shirt", "Chest", "Waist", "Legs", "Feet", "Wrist", "Hands",
  "Finger", "Finger", "Trinket", "Trinket", "Back", "Main hand", "Off hand", "Ranged", "Tabard",
] as const;

/** The paperdoll's columns, as the game lays them out: slot ids. */
export const SHEET_LEFT = [1, 2, 3, 15, 5, 4, 19, 9];
export const SHEET_RIGHT = [10, 6, 7, 8, 11, 12, 13, 14];
export const SHEET_BOTTOM = [16, 17, 18];

/** 1234567 copper → "123g 45s 67c". */
export function money(copper: number): string {
  const g = Math.floor(copper / 10000);
  const s = Math.floor((copper % 10000) / 100);
  const c = copper % 100;
  return g ? `${g}g ${s}s ${c}c` : s ? `${s}s ${c}c` : `${c}c`;
}

/** 93784 seconds → "1d 2h". */
export function played(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

/** ChrRaces ids, as the doll and the manifest count them. */
export const RACE_NAME: Record<number, string> = {
  1: "Human",
  2: "Orc",
  3: "Dwarf",
  4: "Night Elf",
  5: "Undead",
  6: "Tauren",
  7: "Gnome",
  8: "Troll",
};

/** The addon's `A:` token (UnitRace's second return) → race id. */
export const RACE_TOKEN: Record<string, number> = {
  Human: 1,
  Orc: 2,
  Dwarf: 3,
  NightElf: 4,
  Scourge: 5,
  Tauren: 6,
  Gnome: 7,
  Troll: 8,
};

export const FACTION_OF: Record<number, "alliance" | "horde"> = {
  1: "alliance",
  3: "alliance",
  4: "alliance",
  7: "alliance",
  2: "horde",
  5: "horde",
  6: "horde",
  8: "horde",
};

/** Who can be what, in 1.12. The order is the game's class list. */
export const CLASSES_OF: Record<number, ClassId[]> = {
  1: ["warrior", "paladin", "rogue", "priest", "mage", "warlock"],
  3: ["warrior", "paladin", "hunter", "rogue", "priest"],
  4: ["warrior", "hunter", "rogue", "priest", "druid"],
  7: ["warrior", "rogue", "mage", "warlock"],
  2: ["warrior", "hunter", "rogue", "shaman", "warlock"],
  5: ["warrior", "rogue", "priest", "mage", "warlock"],
  6: ["warrior", "hunter", "shaman", "druid"],
  8: ["warrior", "hunter", "rogue", "priest", "shaman", "mage"],
};

export const CLASS_NAME: Record<ClassId, string> = {
  warrior: "Warrior",
  paladin: "Paladin",
  hunter: "Hunter",
  rogue: "Rogue",
  priest: "Priest",
  shaman: "Shaman",
  mage: "Mage",
  warlock: "Warlock",
  druid: "Druid",
};

/** Where each race wakes up: the room behind the creator. */
export const START_ROOM: Record<number, string> = {
  1: "elwynn-forest",
  3: "dun-morogh",
  4: "teldrassil",
  7: "dun-morogh",
  2: "durotar",
  5: "tirisfal-glades",
  6: "mulgore",
  8: "durotar",
};

/* The placard's two sentences per race and per class. The guide's voice:
 * one fact and one turn, never a stat block. */
export const RACE_LINE: Record<number, string> = {
  1: "Stormwind's people. They rebuilt the city twice and are still paying the masons.",
  2: "Came through the portal, lost a war, and were kept in camps. Thrall let them out.",
  3: "Ironforge's. They dig for their own history and keep finding it.",
  4: "Ten thousand years old, and immortal until last year. Still adjusting.",
  5: "Died in the plague, woke up, and chose not to serve. The Forsaken.",
  6: "Mulgore's. The only people in the game who were not at war with anyone.",
  7: "Lost their city to the troggs and their own engineers. Moved in with the dwarves.",
  8: "Darkspear. Left the islands with Thrall and never got around to going back.",
};

export const CLASS_LINE: Record<ClassId, string> = {
  warrior: "Rage, not mana. Everything you do, you do by hitting something first.",
  paladin: "A warrior the Light will not let die. Slow, and very hard to kill.",
  hunter: "You and an animal. The animal does most of the talking.",
  rogue: "Stealth, poison, and a way out. Nobody sees you until they are already sapped.",
  priest: "Heals the party, or shadows it. The two do not mix until sixty.",
  shaman: "Totems, the elements, and a windfury proc that ends conversations.",
  mage: "Glass and fire. Also the one who makes the water, so be nice.",
  warlock: "A demon, a curse, and a soul shard for every emergency. Somebody else's soul.",
  druid: "Four shapes and a bag of seeds. The only class that can be everything, briefly.",
};

const KEY = "tari:character";
/** What the server needs to draw a room for you: class and level. The rest
 *  stays in the browser. A year, because a character does not expire. */
export const WHO_COOKIE = "tari_who";

export function loadCharacter(): Character | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Character) : null;
  } catch {
    return null;
  }
}

export function saveCharacter(c: Character): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
    document.cookie = `${WHO_COOKIE}=${c.cls}:${c.level}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // A browser with storage off still gets the room; it just forgets.
  }
}

/** The cookie, read back on the server: `rogue:24` → who is reading. */
export function readWho(cookie: string | undefined): { cls: string; level: number } | null {
  if (!cookie) return null;
  const [cls, lv] = cookie.split(":");
  const level = Number(lv);
  return cls && Number.isInteger(level) ? { cls, level } : null;
}

/** A name the game would accept: 2–12 letters, one word. */
export function validName(name: string): boolean {
  return /^[A-Za-zÀ-ÿ]{2,12}$/.test(name);
}

const SYLLABLES = ["ka", "ri", "tho", "mal", "en", "dra", "vis", "or", "una", "lek", "sha", "bel", "gru", "nok", "ith", "ael"];

/** A plausible name, the way the game's own Randomize does it. */
export function rollName(): string {
  const n = 2 + Math.floor(Math.random() * 2);
  let s = "";
  for (let i = 0; i < n; i++) s += SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
  return s[0].toUpperCase() + s.slice(1, 12);
}
