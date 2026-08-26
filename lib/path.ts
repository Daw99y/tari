/**
 * THE PATH. docs/DROPS.md step 6; TARI.md §5.
 *
 * The one question that crosses rooms: which of your slots the level has left
 * behind, and which places answer them. Two surfaces read it — the letter's
 * line on /you, and the quiet mark on the sheet's own slots.
 *
 * IT NAMES PLACES, IT DOES NOT RANK THEM. §2.1 refuses a ranked catalogue
 * across zones and DROPS.md refuses a wishlist page, so nothing here sorts
 * rooms by how much they hold or says which to walk into first. A behind slot
 * names the rooms that answer it in the rail's order — the order you pass
 * through the world, which is a fact about Azeroth rather than an opinion
 * about you.
 *
 * IT AGREES WITH THE CORNER OR IT IS WRONG. The filter is `panelRows`, the
 * same window and the same cap the rail's badge and the room's card run: a
 * letter that promises Stranglethorn fills your legs, over a Stranglethorn
 * card that does not draw them, is the app lying about its own room.
 */

import { GEAR_SLOTS, SHEET_SLOTS } from "./character";
import { panelRows } from "./drops-here";
import { DROP_SLOTS } from "./room-drops";
import { getRoom, roomsByKind } from "./rooms";
import { WINDOW_BELOW } from "./window";
import { gearIndices, type WornItem } from "./worn";

/** One thing a room has for a slot: the item, and where it is. */
export type Answer = {
  itemId: number;
  room: string;
  /** The level the room offers it at — the drop row's own number. */
  at: number;
};

/** A slot the level has left behind, and where it fills. */
export type BehindSlot = {
  /** Index into GEAR_SLOTS — the slot id the sheet draws, minus one. */
  at: number;
  label: string;
  /** Nothing worn there at all, rather than something old. */
  empty: boolean;
  /** Room ids that answer it, in the rail's order. Possibly none. */
  rooms: string[];
  /**
   * The actual things those rooms have, in the rail's order and then in the
   * room's own byRank order. Kacey, 2026-08-26: the arrow used to open a list
   * of zone names, which told a reader where to go without telling them what
   * for. It opens the gear now, and each row still says which room it is in —
   * the door survives, it just has an object standing in it.
   */
  answers: Answer[];
};

/* The shirt and the tabard are worn, not equipped: neither has a drop in the
   pipeline and neither can be behind anything. The third slot is in, as of
   2026-08-26 — the sheet draws it now (lib/character.ts, SHEET_BOTTOM), the
   pipeline files bows, guns, thrown and relics against it, and a hunter whose
   ranged weapon is twenty levels old is behind in the one slot that matters
   most to them. */
const NOT_GEAR = new Set([3, 18]);

/** The slots the path speaks about, in the sheet's own reading order. */
export const PATH_SLOTS = SHEET_SLOTS.map((id) => id - 1).filter((at) => !NOT_GEAR.has(at));

/** Gear index → bitmask of the DROP_SLOTS an item could fill it with. The
 *  inverse of `gearIndices`, built once: a Finger row answers two fingers, a
 *  One-Hand row answers either hand. */
const FILLS: number[] = (() => {
  const bits: number[] = [];
  DROP_SLOTS.forEach((slot, i) => {
    for (const at of gearIndices(slot)) bits[at] = (bits[at] ?? 0) | (1 << i);
  });
  return bits;
})();

/* The two hands, by gear index, so the two-hander rule below is not written
   as a pair of magic numbers. */
const MAIN_HAND = GEAR_SLOTS.indexOf("Main hand");
const OFF_HAND = GEAR_SLOTS.indexOf("Off hand");

/** Every room, in the order the rail draws it. */
const RAIL_ORDER: string[] = roomsByKind().flatMap((g) => g.rooms.map((r) => r.id));

/**
 * Behind, measured against the window rather than against a new number.
 *
 * A room offers you things from five levels below you up. What you are wearing
 * has fallen out of the bottom of that: the rooms would no longer hand it to
 * you. Nothing worn at all is behind by the same argument, and more plainly.
 */
export function isBehind(worn: WornItem | undefined, level: number): boolean {
  if (!worn) return true;
  return (worn.il ?? worn.rl ?? 0) < level - WINDOW_BELOW;
}

/**
 * The path, for one character.
 *
 * `dict` is what /api/items said about the gear ids — the sheet fetches it
 * once. Until it lands there is no path, because half a judgement drawn now
 * and corrected a moment later is the sheet accusing slots at random. A gear
 * id the dictionary has never heard of is skipped for the same reason.
 */
export function readPath(
  gear: number[],
  dict: Record<string, WornItem> | null,
  cls: string | null,
  level: number,
  found: (itemId: number) => boolean,
): BehindSlot[] {
  if (!dict) return [];

  /* A two-hander occupies both hands. An empty off hand under one is the
     weapon's own doing, not a gap, and the game draws it greyed for the same
     reason — so the sheet does not accuse it. */
  const twoHanded = dict[String(gear[MAIN_HAND] ?? 0)]?.s === "Two-Hand";

  const behind: BehindSlot[] = [];
  for (const at of PATH_SLOTS) {
    if (at === OFF_HAND && twoHanded) continue;
    const id = gear[at] ?? 0;
    const worn = id ? dict[String(id)] : undefined;
    if (id && !worn) continue;
    if (!isBehind(worn, level)) continue;
    behind.push({ at, label: GEAR_SLOTS[at], empty: !id, rooms: [], answers: [] });
  }
  if (behind.length === 0) return behind;

  /* One pass over the world: what each room still has open, as slot bits, and
     the rows themselves so the arrow can show them. */
  const want = behind.reduce((bits, s) => bits | (FILLS[s.at] ?? 0), 0);
  for (const room of RAIL_ORDER) {
    const rows = panelRows(room, cls, level).filter((row) => !found(row[0]));
    let open = 0;
    for (const row of rows) open |= 1 << row[3];
    if (!(open & want)) continue;
    for (const s of behind) {
      const fills = FILLS[s.at] ?? 0;
      if (!(open & fills)) continue;
      s.rooms.push(room);
      for (const row of rows) if (fills & (1 << row[3])) s.answers.push({ itemId: row[0], room, at: row[1] });
    }
  }
  return behind;
}

/**
 * Every item the world is offering this character right now, by id, with the
 * first room in the rail's order that offers it.
 *
 * The drawer holds the whole wardrobe and most of it is not going to fall out
 * of anything soon; this is how a row knows whether it has a door behind it.
 * Same filter as everything else — if this disagrees with the corner, this is
 * wrong.
 */
export function offeredIn(cls: string | null, level: number): Map<number, string> {
  const where = new Map<number, string>();
  for (const room of RAIL_ORDER) {
    for (const row of panelRows(room, cls, level)) if (!where.has(row[0])) where.set(row[0], room);
  }
  return where;
}

/* --------------------------------------------------------------------------
   The letter's line.

   Two sentences in §5's register: what changed, then the places. Never an
   instruction, never a table, and never more names than a sentence can hold.
-------------------------------------------------------------------------- */

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function count(n: number): string {
  return WORD[n] ?? String(n);
}

function up(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/** "Duskwood", "Duskwood and Wetlands". */
function names(ids: string[]): string {
  const list = ids.map((id) => getRoom(id)?.name ?? id);
  return list.length <= 1 ? (list[0] ?? "") : `${list[0]} and ${list[1]}`;
}

/**
 * The letter's line, as one or two sentences, and a third when the reader has
 * dressed the character by hand. Empty when nothing is behind and nothing is
 * planned — a letter with nothing in it is not written.
 *
 * THE THIRD SENTENCE IS THE HONEST ONE. docs/DRESSING.md: the plan is what
 * every surface reads, which would make the first two sentences quietly
 * describe a character who does not exist. So the letter says how much of the
 * character is the reader's own doing, in its own voice, and says nothing at
 * all when the answer is none. The register of the first two does not change:
 * they are true about the figure on the screen either way, and a conditional
 * grammar threaded through both of them to carry one fact would be the app
 * apologising rather than stating.
 *
 * IT COUNTS SLOTS, NOT SLOTS IT MENTIONED. `planned` is every slot the reader
 * dressed — including the shirt and the tabard, which PATH_SLOTS refuses, and
 * including slots that are not behind anything. That is on purpose: the
 * sentence answers "how much of this figure did I choose", which is a
 * question about the character, not about the two sentences above it.
 *
 * THE SECOND SENTENCE NAMES ONE PLACE, OR TWO. Every room in the window
 * answers something, and a sentence that listed forty of them would be the
 * shopping list §2.1 refuses wearing a comma. So it names where the most of
 * your gaps happen to close at once — a fact about a place, not a verdict on
 * it — and where two places do that equally, the rail's order picks, because
 * the order you pass through the world is nobody's opinion.
 */
export function letter(path: BehindSlot[], planned = 0): string[] {
  const yours = planned > 0 ? [`${up(count(planned))} ${planned === 1 ? "slot is" : "slots are"} yours, not the game's.`] : [];
  if (path.length === 0) return yours;

  const old = path.filter((s) => !s.empty).length;
  const bare = path.length - old;
  const lines: string[] = [];

  /* Wearing nothing at all is not sixteen separate failures, and a letter
     that counted them would be scolding a character who has only just been
     made. It is one fact, said once. */
  const naked = bare === path.length && path.length === PATH_SLOTS.length;

  const older = `${count(old)} of your slots ${old === 1 ? "is" : "are"} older than your level`;
  const empty = `${count(bare)} of your slots ${bare === 1 ? "is" : "are"} empty`;
  if (naked) lines.push("Nothing worn yet.");
  else if (old && bare) lines.push(`${up(older)}, and ${count(bare)} ${bare === 1 ? "is" : "are"} empty.`);
  else lines.push(`${up(old ? older : empty)}.`);

  const fills = new Map<string, number>();
  for (const slot of path) for (const id of slot.rooms) fills.set(id, (fills.get(id) ?? 0) + 1);
  if (fills.size === 0) return [...lines, ...yours];

  const most = Math.max(...fills.values());
  const spoken = RAIL_ORDER.filter((id) => fills.get(id) === most).slice(0, 2);

  /* "them" needs the first sentence to have counted slots. When it did not,
     the second one names them itself. */
  const subject = naked
    ? up(`${count(most)} of your slots`)
    : path.length === 1
      ? "It"
      : most === path.length
        ? `All ${count(most)} of them`
        : up(`${count(most)} of them`);
  const verb = most === 1 ? "fills" : "fill";
  lines.push(`${subject} ${verb} in ${names(spoken)}.`);

  return [...lines, ...yours];
}
