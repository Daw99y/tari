/**
 * HOW MANY DROPS ARE STILL WAITING IN A ROOM, FOR THIS CHARACTER, RIGHT NOW.
 *
 * The room screen has answered this in its corner since the summons landed
 * (app/(app)/r/[room]/Drops.tsx). The rail could not, so the rail was a list
 * of forty places that all looked equally worth walking into, and the only way
 * to find out which one had anything in it was to open all forty.
 *
 * WHY THIS IS NOT JUST `panelFor`. It is exactly panelFor, followed by exactly
 * the corner's own subtraction — the same window, the same cap, the same
 * ranking, the same found record — and the one thing it does differently is
 * where it reads from. panelFor takes a LootFile, and a LootFile is the whole
 * room: every item, its sources, its icon, its tooltip. The rail renders on
 * every page in the app and would have to hold all 75 of them.
 *
 * So it reads `lib/room-drops.ts` instead: the same items reduced to an id, a
 * level and a class mask, pre-sorted into byRank order by the generator. The
 * order is what makes the two agree — filtering a byRank-ordered list leaves it
 * byRank-ordered, so taking the first eight here lands on the same eight
 * panelFor takes. See the generator for why the sort could not be done here.
 *
 * If the two ever disagree, this file is wrong and the corner is right.
 */

import { DROP_CLASSES, ROOM_DROPS } from "./room-drops";
import { PANEL_CEILING, WINDOW_ABOVE, WINDOW_BELOW } from "./window";

/**
 * The count the rail prints. Zero for a room with nothing in the window, for a
 * room the pipeline has no drops for, and for a reader with no character —
 * and zero means the badge does not render at all, which is the point: a rail
 * of seventy-five zeroes is the list it already was.
 *
 * `found` is asked per item rather than handed in as a set because the caller
 * already holds the marks and building one set per room would be seventy-five
 * of them per render. A character with nothing ticked passes a function that
 * always says false, which costs nothing.
 */
export function dropsHere(
  roomId: string,
  cls: string | null,
  level: number,
  found: (itemId: number) => boolean,
): number {
  const rows = ROOM_DROPS[roomId];
  if (!rows) return 0;

  const at = cls ? DROP_CLASSES.indexOf(cls as (typeof DROP_CLASSES)[number]) : -1;
  /* A class the mask has never heard of is not "every item" — it is a bad
     argument, and answering it with the unfiltered count would tell the reader
     that every zone is full. */
  if (cls && at < 0) return 0;
  const bit = at < 0 ? 0 : 1 << at;

  const low = level - WINDOW_BELOW;
  const high = level + WINDOW_ABOVE;

  let taken = 0;
  let open = 0;
  for (const [itemId, avail, mask] of rows) {
    if (bit && !(mask & bit)) continue;
    if (avail < low || avail > high) continue;
    if (!found(itemId)) open++;
    /* The cap counts what the panel would have shown, not what is open: eight
       drops with three ticked off is five still waiting, not eight. */
    if (++taken === PANEL_CEILING) break;
  }
  return open;
}
