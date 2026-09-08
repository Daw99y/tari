/**
 * WHICH ZONE IS HOLDING THE MOST FOR THIS CHARACTER.
 *
 * Kacey, 2026-09-09: the front door should not open on a question. A dashboard
 * that lands on Duskwood and a dropdown is asking the reader to do the work the
 * app is for — so when nothing else has an opinion about where to look, it
 * looks where there is most to find.
 *
 * IT DOES NOT OVERRULE A LAST-SEEN. docs/DIRECTION.md §4.1 still stands: if the
 * client told us where the character logged out, that is where the column opens
 * and this file is never asked. This answers the other case, the one that used
 * to be a fallback to Duskwood.
 *
 * IT IS THE RAIL'S OWN COUNT, ASKED SEVENTY-FIVE TIMES. `dropsHere` is what
 * prints on every rail row (lib/drops-here.ts), so the zone this picks is the
 * zone wearing the biggest badge on the reader's own sidebar. Any other sum
 * would put two numbers on one screen that disagree about the same question.
 *
 * IT READS ROOM_DROPS AND NEVER THE LOOT FILES. Seventy-five loot files is
 * 2,320 items; this walks the same index the rail walks, which is six numbers
 * per item, and it runs on the server and in the browser unchanged.
 *
 * THE JUDGE IS OPTIONAL AND THAT IS THE WHOLE SUBTLETY. Judging an upgrade
 * needs the worn dictionary, and the dictionary is fetched by the browser
 * (lib/use-worn.ts) — a server component has the class and the level off the
 * cookie and cannot have the gear. So the server picks on class and level
 * alone, which is a good answer instantly, and the browser asks again with the
 * judge once the dictionary lands. Same function, same order, two callers.
 */

import { dropsHere } from "./drops-here";
import type { DropRow } from "./room-drops";
import { roomsByKind } from "./rooms";

/** Every room the rail draws, in the order it draws them. Ties break on this,
 *  so two zones holding the same number resolve to the earlier one — which is
 *  the lower band, which is the one a levelling character wants. */
const RAIL_ORDER: string[] = roomsByKind().flatMap((g) => g.rooms.map((r) => r.id));

/** Nothing ticked. The server has no marks and passes this. */
const NOTHING = () => false;

export type Pick = {
  room: string;
  /** How many rows are open there — the number on the rail's badge. */
  open: number;
};

/**
 * The room with the most waiting in it, or null when every room is empty for
 * this character — which is what a level-60 in finished gear looks like, and
 * is a real answer rather than a failure.
 *
 * `found` and `judge` are the reader's own record and the upgrade judge. Both
 * absent is the server's call; both present is the browser's, once it knows
 * what the character is wearing.
 */
export function bestZone(
  cls: string | null,
  level: number,
  found: (itemId: number) => boolean = NOTHING,
  judge?: (row: DropRow) => boolean,
): Pick | null {
  let bestRoom: string | null = null;
  let bestOpen = 0;
  /* The finest colour waiting in the winner so far. Two zones holding four
     rows each are separated by whether one of them is holding a blue. */
  let bestQuality = -1;

  for (const room of RAIL_ORDER) {
    const { open, best: quality } = dropsHere(room, cls, level, found, judge);
    if (open === 0) continue;
    if (open > bestOpen || (open === bestOpen && quality > bestQuality)) {
      bestRoom = room;
      bestOpen = open;
      bestQuality = quality;
    }
  }

  return bestRoom === null ? null : { room: bestRoom, open: bestOpen };
}
