/* THE DENSE LAYER, READ. docs/DROPS.md, "A second file family".
 *
 * lib/spots/<room>.json is scripts/map-spots.py's emission: creatureId →
 * busiest camp + every spawn, in 1.12 map percent. SERVER ONLY, like
 * lib/maps.ts and for the same reason — the room loads only the spots its
 * eight rows name, and nothing here rides the client bundle.
 *
 * Quest rewards have no camp; their spot is the giver's, and the curated
 * layer already holds him. So the hunt is a join: drops through the spots
 * file, quests through the plate's own pins. */

import type { HuntSpot } from "./hunt";
import { bestSource } from "./hunt";
import type { Item } from "./loot";
import type { ZonePlate } from "./plate";

type SpotRow = { x: number; y: number; n: number; p: [number, number][] };
type SpotsFile = { room: string; zoneId: number; spots: Record<string, SpotRow> };

async function spotsFile(roomId: string): Promise<SpotsFile | null> {
  try {
    const loaded = await import(`./spots/${roomId}.json`);
    return ((loaded as { default?: unknown }).default ?? loaded) as SpotsFile;
  } catch {
    return null; // A room the dense layer has nothing for. The hunt is just thinner.
  }
}

/** The hunt: one spot per source the drawn items name, placed. */
export async function huntFor(
  roomId: string,
  items: Item[],
  plate: ZonePlate | undefined
): Promise<HuntSpot[]> {
  const file = await spotsFile(roomId);
  const out = new Map<string, HuntSpot>();

  for (const item of items) {
    for (const s of item.sources) {
      if (s.type === "drop") {
        const row = file?.spots[String(s.sourceId)];
        if (!row) continue;
        const key = `d${s.sourceId}`;
        const cur = out.get(key);
        if (cur) cur.itemIds.push(item.itemId);
        else
          out.set(key, {
            kind: "drop",
            name: s.sourceName,
            x: row.x,
            y: row.y,
            p: row.p,
            itemIds: [item.itemId],
            creatureId: s.sourceId,
          });
      } else {
        /* The giver: the pin whose quest list carries this quest. Only the
           best source marks a giver — a reward's third alternative source
           would otherwise scatter marks the reader never asked about. */
        if (bestSource(item)?.sourceId !== s.sourceId) continue;
        const pin = plate?.pins.find(
          (p) => p.kind === "giver" && p.quests.some((q) => q.id === s.sourceId)
        );
        if (!pin) continue;
        const key = `g${pin.id}-${pin.x}`;
        const cur = out.get(key);
        if (cur) {
          cur.itemIds.push(item.itemId);
          if (!cur.questIds!.includes(s.sourceId)) cur.questIds!.push(s.sourceId);
        } else
          out.set(key, {
            kind: "giver",
            name: pin.name,
            x: pin.x,
            y: pin.y,
            p: [[pin.x, pin.y]],
            itemIds: [item.itemId],
            questIds: [s.sourceId],
          });
      }
    }
  }
  return [...out.values()];
}
