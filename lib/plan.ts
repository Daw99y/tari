/**
 * THE PLAN. docs/DRESSING.md.
 *
 * What the reader put on the character by hand, laid over what the addon
 * said they were wearing. Four rulings from Kacey (2026-08-26) live in this
 * file and it exists so they live in one place:
 *
 * 1. **The import is never overwritten.** `Character.gear` stays exactly what
 *    `/tari` handed over. A hand-equipped slot is an `equip` mark and nothing
 *    else, so clearing it gives the imported item back and a re-import cannot
 *    lose a choice — the two halves never touch.
 * 2. **The plan is the truth.** Everything downstream reads `gearOf`, not
 *    `character.gear`: the doll, the sheet's slots, the path's arrows and
 *    letter, the room's kit rows and the stage's worn line. There is one
 *    character and it wears what you told it to.
 * 3. **And it says so.** Because 2 would otherwise be the app quietly
 *    mistaking a plan for a fact, every surface that reads the plan can also
 *    ask which slots are yours — `plannedAt` — and says so where the reader
 *    is looking. The sheet marks the slots and counts them; the letter turns
 *    conditional; the stage's line names what it is pricing against.
 * 4. **It is a mark, so it is local first and syncs like every other one.**
 *    `equip` was already one of the six kinds in lib/sync.ts, tombstoned,
 *    keyed per character — the odd one, a slot→item map rather than a set.
 *    This is the store it was declared for.
 *
 * The subject is the gear index as a string; `val` is the item id. Taking a
 * slot back is `setMark(..., false)`, which tombstones rather than deletes,
 * so an undressed slot on this machine beats a dressed one on the other.
 */

import { GEAR_SLOTS, type Character } from "./character";
import { marksNow, setMark, type MarkStore } from "./marks";

const NONE = new Map<number, number>();

/** Every slot this character has dressed by hand: gear index → item id.
 *
 *  Bounded the way `app/api/wardrobe` bounds its own `at`, and for the same
 *  reason: a mark carrying a subject this build has never drawn — an older
 *  schema, another machine, a hand-edited store — must not stretch the gear
 *  array to meet it. */
export function plannedAt(store: MarkStore, char: string | null): Map<number, number> {
  const rows = char ? store.on[char]?.equip : undefined;
  if (!rows) return NONE;
  const plan = new Map<number, number>();
  for (const [subject, val] of Object.entries(rows)) {
    const at = Number(subject);
    const id = Number(val);
    if (Number.isInteger(at) && at >= 0 && at < GEAR_SLOTS.length && id > 0) plan.set(at, id);
  }
  return plan.size ? plan : NONE;
}

/**
 * The plan as one short string, for a `useMemo` to hold on to.
 *
 * THIS IS LOAD-BEARING. `useMarks` hands back a new store object on every
 * commit — a starred room, a found item, a sync that pulled nothing — and a
 * plan memo keyed on that store returns a new Map every time, which returns a
 * new gear array, which re-runs the sheet's dressing effect, which tears down
 * and rebuilds every mesh and texture on the figure. Keyed on this instead,
 * the figure is rebuilt when the gear changes and at no other moment.
 */
export function planKey(store: MarkStore, char: string | null): string {
  const rows = char ? store.on[char]?.equip : undefined;
  if (!rows) return "";
  return Object.keys(rows)
    .sort()
    .map((at) => `${at}:${rows[at]}`)
    .join(",");
}

/** The import with the plan laid over it. A slot nobody has touched is the
 *  import's own; a slot the reader has dressed is theirs. */
export function overlay(gear: number[], plan: Map<number, number>): number[] {
  if (plan.size === 0) return gear;
  const out = [...gear];
  for (const [at, id] of plan) out[at] = id;
  return out;
}

/** What this character is wearing, plan included, against a store the caller
 *  already has. The room's surfaces subscribe to marks and pass theirs in, so
 *  a plan that lands mid-session reaches them rather than sitting behind the
 *  snapshot their first effect took. */
export function gearFrom(store: MarkStore, me: Character | null): number[] {
  if (!me) return [];
  return overlay(me.gear, plannedAt(store, me.key));
}

/** The same, read once and outside React, for a caller with nothing to
 *  subscribe. */
export function gearOf(me: Character | null): number[] {
  return gearFrom(marksNow(), me);
}

/** Put an item in a slot by hand. */
export function planSlot(char: string, at: number, itemId: number): void {
  setMark(char, "equip", String(at), true, String(itemId));
}

/** Give the slot back to the import. */
export function clearSlot(char: string, at: number): void {
  setMark(char, "equip", String(at), false, null);
}
