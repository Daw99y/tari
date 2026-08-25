/* THE CHARACTER. docs/CHARACTER.md: you are your character.
 *
 * One type, one place it lives signed out (localStorage), and the game's
 * own tables — who can be what, and where each race wakes up. Signed in,
 * the same object goes to `characters` through the sync push. */

import { skillSlug } from "./import";
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

/** The row under the doll. Melee only — main hand and off hand.
 *
 *  Slot 18, the ranged one, is deliberately absent. A bow, a gun and a wand
 *  all hang off a hand socket, and so does an off-hand weapon, so drawing the
 *  ranged slot alongside the other two gives a character three weapons and two
 *  hands to hold them in. The game solves this by animating one set at a time;
 *  the sheet has no animation to switch, so it draws what the character is
 *  swinging. */
export const SHEET_BOTTOM = [16, 17];

/** Every slot the sheet draws, in no particular order. What the figure wears
 *  comes from this list rather than from all 19, so a slot the sheet leaves
 *  out is also a model the doll does not hang. */
export const SHEET_SLOTS = [...SHEET_LEFT, ...SHEET_RIGHT, ...SHEET_BOTTOM];

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

/** The same eight, as file names. `scripts/create-icons.py` writes the
 *  client's own portraits under these. */
export const RACE_SLUG: Record<number, string> = {
  1: "human",
  2: "orc",
  3: "dwarf",
  4: "night-elf",
  5: "undead",
  6: "tauren",
  7: "gnome",
  8: "troll",
};

/* The creation screen's own art, lifted out of a 1.12 client by
 * `scripts/create-icons.py`. The client draws its race, class and sex marks
 * from three atlases; these are those cells, one file each, with Blizzard's
 * dark rounded border already painted in — which is why nothing here draws a
 * frame around them. */
const CREATE_ART = "/create";

export function racePortrait(race: number, sex: number): string {
  return `${CREATE_ART}/race-${RACE_SLUG[race] ?? "human"}-${sex === 1 ? "female" : "male"}.webp`;
}

export function classIcon(cls: ClassId): string {
  return `${CREATE_ART}/class-${cls}.webp`;
}

export function sexIcon(sex: number): string {
  return `${CREATE_ART}/sex-${sex === 1 ? "female" : "male"}.webp`;
}

export function crestIcon(faction: "alliance" | "horde"): string {
  return `${CREATE_ART}/crest-${faction}.webp`;
}

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

/* ---------------------------------------------------------------------------
   The roster.

   A reader has as many characters as they play, the way an account has as
   many as it rolled, and the app is always looking at exactly one of them.
   So the browser holds two things: the list, and whose key is in play.

   Everything outside this file still asks `loadCharacter()` for one character
   and gets the active one, which is why the rail, the shell and the sheet did
   not have to learn about any of this.
--------------------------------------------------------------------------- */

/** Where a single character lived before there was a roster. Read once, moved
 *  into the list, and deleted, so it cannot come back after the last character
 *  is dropped. */
const LEGACY = "tari:character";
const ROSTER = "tari:characters";
const ACTIVE = "tari:active";

/** What the server needs to draw a room for you: class and level. The rest
 *  stays in the browser. A year, because a character does not expire. */
export const WHO_COOKIE = "tari_who";

function readList(): Character[] {
  const raw = localStorage.getItem(ROSTER);
  if (raw) {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? (list as Character[]) : [];
  }
  /* First read on a browser that predates the roster. */
  const one = localStorage.getItem(LEGACY);
  if (!one) return [];
  const c = JSON.parse(one) as Character;
  localStorage.setItem(ROSTER, JSON.stringify([c]));
  localStorage.setItem(ACTIVE, c.key);
  localStorage.removeItem(LEGACY);
  return [c];
}

/** The cookie the room reads on the server. Written whenever the active
 *  character changes, because that is the only thing it says. */
function markActive(c: Character | null): void {
  if (c) {
    localStorage.setItem(ACTIVE, c.key);
    document.cookie = `${WHO_COOKIE}=${c.cls}:${c.level}; path=/; max-age=31536000; samesite=lax`;
  } else {
    localStorage.removeItem(ACTIVE);
    document.cookie = `${WHO_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

/** Every character on this browser, oldest first. */
export function loadRoster(): Character[] {
  try {
    return readList();
  } catch {
    return [];
  }
}

/** The one in play. Falls back to the first in the list rather than to null:
 *  a roster with nobody active is a reader staring at the creator for no
 *  reason. */
export function loadCharacter(): Character | null {
  try {
    const list = readList();
    if (list.length === 0) return null;
    const key = localStorage.getItem(ACTIVE);
    return list.find((c) => c.key === key) ?? list[0];
  } catch {
    return null;
  }
}

/** Add or replace one character by key, and put it in play. */
export function saveCharacter(c: Character): void {
  try {
    const list = readList();
    const at = list.findIndex((x) => x.key === c.key);
    if (at === -1) list.push(c);
    else list[at] = c;
    localStorage.setItem(ROSTER, JSON.stringify(list));
    markActive(c);
  } catch {
    // A browser with storage off still gets the room; it just forgets.
  }
}

/** Put one of the saved characters in play. */
export function selectCharacter(key: string): Character | null {
  try {
    const c = readList().find((x) => x.key === key) ?? null;
    if (c) markActive(c);
    return c;
  } catch {
    return null;
  }
}

/** Drop one character. Returns whoever is in play afterwards, which is the
 *  next one along, or nobody once the list is empty. */
export function removeCharacter(key: string): Character | null {
  try {
    const list = readList().filter((c) => c.key !== key);
    localStorage.setItem(ROSTER, JSON.stringify(list));
    const active = localStorage.getItem(ACTIVE);
    if (active === key || !list.some((c) => c.key === active)) {
      markActive(list[0] ?? null);
      return list[0] ?? null;
    }
    return list.find((c) => c.key === active) ?? null;
  } catch {
    return null;
  }
}

/** The cookie, read back on the server: `rogue:24` → who is reading. */
export function readWho(cookie: string | undefined): { cls: string; level: number } | null {
  if (!cookie) return null;
  const [cls, lv] = cookie.split(":");
  const level = Number(lv);
  return cls && Number.isInteger(level) ? { cls, level } : null;
}

/** The ceiling in 1.12. Nothing in Tari goes past it. */
export const MAX_LEVEL = 60;

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

/* ---------------------------------------------------------------------------
   Trades.

   The addon's `P:` field is every skill line the client reports — the trades,
   the weapon lines, Defense, the languages, riding, and the class's own trees.
   The sheet prints one of those groups. A trade is a thing you chose and are
   working on; the rest is a number that follows you around, and a corner of
   twenty-four rows reading 300 says nothing about anybody.

   The list is written by hand rather than derived. The client hands over
   localised names with no flag on a line saying "this one is a profession", so
   a hand list is the only honest way to know — and it is twelve words that have
   not changed since 2004. Weapon skills are read elsewhere, by lib/import.ts,
   where a lagging one is worth a sentence.
--------------------------------------------------------------------------- */

/** The nine primary trades, then the three anyone can take. The order is the
    order the sheet prints them in. */
export const TRADES = [
  "Alchemy", "Blacksmithing", "Enchanting", "Engineering", "Herbalism",
  "Leatherworking", "Mining", "Skinning", "Tailoring",
  "First Aid", "Cooking", "Fishing",
] as const;

/** Every trade's ceiling in 1.12. What a character can currently train to is
    lower and the export does not carry it, so the row states the ceiling. */
export const TRADE_CAP = 300;

const TRADE_ORDER = new Map(TRADES.map((name, i) => [skillSlug(name), i] as const));

/** The `P:` field, down to the trades, in the list's order. */
export function trades(
  skills: { name: string; rank: number }[] | undefined
): { name: string; rank: number }[] {
  if (!skills) return [];
  return skills
    .filter((s) => TRADE_ORDER.has(skillSlug(s.name)))
    .sort((a, b) => TRADE_ORDER.get(skillSlug(a.name))! - TRADE_ORDER.get(skillSlug(b.name))!);
}
