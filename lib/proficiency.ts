/**
 * WHAT A CLASS CAN WEAR AND SWING, IN 1.12.
 *
 * The dressing room's drawer offers what your class and level can actually
 * put on (docs/DRESSING.md, Kacey's ruling) — so the drawer needs the one
 * table the item dictionary does not carry. `reference/items.json` knows an
 * item's slot and its subclass; nothing anywhere knows which classes may hold
 * a Sword. This is that, written by hand.
 *
 * WRITTEN, NOT DERIVED. The 1.12 client states proficiency through spells a
 * character has trained, which is a fact about one character rather than about
 * a class, and the export does not carry it. These nine lists have not moved
 * since 2004. lib/character.ts holds TRADES by the same argument.
 *
 * THE TWO STEPS ARE THE ONLY LEVEL IN IT. Plate at 40 for the warrior and the
 * paladin, mail at 40 for the hunter and the shaman. Everything else a class
 * can use, it can use at one.
 *
 * PERMISSIVE WHERE THE DICTIONARY IS QUIET. A row with no subclass is a ring,
 * a cloak, a neck or a tabard — nobody is barred from those — and a weapon
 * filed under Miscellaneous is a blacksmith's hammer. An unknown word is
 * allowed rather than refused: the drawer's job is to cut the noise, not to
 * police a character.
 */

import type { ClassId } from "./loot";

/** The four armour subclasses, weakest first. */
const ARMOUR = ["Cloth", "Leather", "Mail", "Plate"];

/** Armour a class wears from level one, and the one it is handed at 40. */
const WEARS: Record<ClassId, { from1: string[]; at40?: string }> = {
  warrior: { from1: ["Cloth", "Leather", "Mail"], at40: "Plate" },
  paladin: { from1: ["Cloth", "Leather", "Mail"], at40: "Plate" },
  hunter: { from1: ["Cloth", "Leather"], at40: "Mail" },
  shaman: { from1: ["Cloth", "Leather"], at40: "Mail" },
  rogue: { from1: ["Cloth", "Leather"] },
  druid: { from1: ["Cloth", "Leather"] },
  priest: { from1: ["Cloth"] },
  mage: { from1: ["Cloth"] },
  warlock: { from1: ["Cloth"] },
};

/** The level the second armour class arrives. */
export const ARMOUR_STEP = 40;

/** Every weapon subclass a class may hold, in either hand. */
const WIELDS: Record<ClassId, string[]> = {
  warrior: ["Axe", "Mace", "Sword", "Dagger", "Fist Weapon", "Polearm", "Staff", "Bow", "Crossbow", "Gun", "Thrown"],
  paladin: ["Axe", "Mace", "Sword", "Polearm"],
  hunter: ["Axe", "Sword", "Dagger", "Fist Weapon", "Polearm", "Staff", "Bow", "Crossbow", "Gun", "Thrown"],
  rogue: ["Dagger", "Sword", "Mace", "Fist Weapon", "Bow", "Crossbow", "Gun", "Thrown"],
  priest: ["Dagger", "Mace", "Staff", "Wand"],
  shaman: ["Axe", "Mace", "Staff", "Dagger", "Fist Weapon"],
  mage: ["Dagger", "Sword", "Staff", "Wand"],
  warlock: ["Dagger", "Sword", "Staff", "Wand"],
  druid: ["Dagger", "Fist Weapon", "Mace", "Staff", "Polearm"],
};

/** Which of those it may hold in both hands. A rogue owns Sword and will
 *  never own a two-handed one; a staff is two-handed and nothing else. */
const BOTH_HANDS: Record<ClassId, string[]> = {
  warrior: ["Axe", "Mace", "Sword", "Polearm", "Staff"],
  paladin: ["Axe", "Mace", "Sword", "Polearm"],
  hunter: ["Axe", "Sword", "Polearm", "Staff"],
  rogue: [],
  priest: ["Staff"],
  shaman: ["Axe", "Mace", "Staff"],
  mage: ["Staff"],
  warlock: ["Staff"],
  druid: ["Mace", "Staff", "Polearm"],
};

/** Who may put a shield on the off hand. */
const SHIELDS = new Set<ClassId>(["warrior", "paladin", "shaman"]);

/** Who may hold a second weapon, and from what level. Three classes in 1.12
 *  and nobody else — a paladin's off hand takes a shield or a tome and
 *  nothing with an edge on it. Shaman dual wield is a Burning Crusade thing
 *  and does not belong here. */
const DUAL_WIELD: Partial<Record<ClassId, number>> = { warrior: 20, rogue: 10, hunter: 20 };

/** Anybody's, whatever the class list says. */
const ANYONE = new Set(["Fishing Pole", "Miscellaneous", "Exotic"]);

/** The relics only one class each may carry. Unreachable today — the sheet
 *  does not draw the ranged socket (lib/character.ts, SHEET_BOTTOM) — and
 *  written anyway, because a table that is silently wrong about three rows is
 *  worse than one that is right about them before anybody looks. */
const RELIC: Record<string, ClassId> = { Libram: "paladin", Idol: "druid", Totem: "shaman" };

/** The armour this class is wearing at this level. */
export function armourAt(cls: ClassId, level: number): string[] {
  const w = WEARS[cls];
  if (!w) return ARMOUR;
  return w.at40 && level >= ARMOUR_STEP ? [...w.from1, w.at40] : w.from1;
}

/**
 * Whether this class, at this level, can equip a row of the dictionary.
 *
 * `slot` and `sub` are `s` and `sc` off `reference/items.json`. A null class
 * is a body nobody has stated a class for, and everything fits it.
 */
export function canEquip(cls: ClassId | null, level: number, slot: string, sub?: string): boolean {
  if (!cls || !WIELDS[cls]) return true;
  if (!sub || ANYONE.has(sub)) return true;

  if (slot === "Shield") return SHIELDS.has(cls);
  if (ARMOUR.includes(sub)) return armourAt(cls, level).includes(sub);
  if (RELIC[sub]) return RELIC[sub] === cls;

  if (!WIELDS[cls].includes(sub)) return false;
  if (slot === "Two-Hand") return BOTH_HANDS[cls].includes(sub);
  return true;
}

/**
 * Whether this row may go in the *second* hand, on top of fitting at all.
 *
 * `gearIndices` sends every one-hander to both hands, which is right for a
 * rogue and wrong for everybody else: holding a weapon in the off hand is a
 * trained skill in 1.12 and three classes have it. A shield and a tome are
 * not weapons and are not covered by it.
 */
export function canOffHand(cls: ClassId | null, level: number, slot: string, sub?: string): boolean {
  if (!cls) return true;
  if (slot === "Shield" || slot === "Held") return true;
  if (!sub) return true;
  const from = DUAL_WIELD[cls];
  return from !== undefined && level >= from;
}
