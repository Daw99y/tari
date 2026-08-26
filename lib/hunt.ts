/* THE HUNT LAYER'S SHAPE. Client-safe: types and pure lookups, no data.
 *
 * A HuntSpot is one source of this room's drops, standing where it stands —
 * a creature at its busiest camp with its other spawns around it, or a
 * quest giver at his spot. Built on the server (lib/spots.ts) from the
 * eight rows the room drew, so the map's hunt marks and the stage's crop
 * read the same file and never disagree about where a thing is. */

import type { Item, Source } from "./loot";

export type HuntSpot = {
  kind: "drop" | "giver";
  /** The creature's name, or the giver's. */
  name: string;
  /** 1.12 map percent — the plate's `reg` carries it onto the picture. */
  x: number;
  y: number;
  /** Every recorded spawn, the busiest first. A giver has one. */
  p: [number, number][];
  /** Which of the room's drawn items this spot answers for. */
  itemIds: number[];
  /** Drop only: the creature id, for matching a source to its spot. */
  creatureId?: number;
  /** Giver only: the quest ids he starts, of the drawn items'. */
  questIds?: number[];
};

/** The source the route draws: the likeliest one. Same sort as the row's
 *  one-line summary, so no surface ever names two different creatures. */
export function bestSource(item: Item): Source | undefined {
  return [...item.sources].sort((a, b) => (b.dropChance ?? 100) - (a.dropChance ?? 100))[0];
}

/** Where one source stands, if the layer knows. */
export function spotOf(hunt: HuntSpot[], source: Source): HuntSpot | undefined {
  if (source.type === "quest") return hunt.find((h) => h.questIds?.includes(source.sourceId));
  return hunt.find((h) => h.creatureId === source.sourceId);
}

/** Where the opened item's route begins: its best source's spot. */
export function spotForItem(hunt: HuntSpot[], item: Item): HuntSpot | undefined {
  const s = bestSource(item);
  return s ? spotOf(hunt, s) : undefined;
}
