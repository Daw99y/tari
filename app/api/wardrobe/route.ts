/* THE DRAWER'S DOOR. docs/DRESSING.md.
 *
 * One slot, one class, one level: the ids of everything that character could
 * put there, strongest first. The dressing room's drawer asks when it opens
 * and never again — a slot's answer does not change until the character does.
 *
 * WHY A ROUTE RATHER THAN A WIDER CATALOGUE. `public/lab/doll/items/
 * catalogue.json` is what the browser already holds, and it carries the look
 * of every item but neither its required level nor its subclass — so it
 * cannot tell a rogue from a paladin. `reference/items.json` carries both and
 * is 1.8 MB, which is not going in a bundle for one popover. The dictionary
 * is already loaded and held by /api/items for exactly this reason; this is
 * the second door onto it.
 *
 * IDS, AND THE PLATE. The drawer draws its rows from the catalogue it already
 * has — icon, name, quality and the look the doll needs — so an item this
 * route names that the catalogue has never heard of is one the doll could not
 * draw anyway, and the client drops it. The dictionary rows ride along because
 * the drawer hovers a plate over every row and this file already has them
 * open: a second request per drawer, for facts sitting in the same map, would
 * be two round trips for one press. GET, cacheable, no body.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { CLASS_NAME, GEAR_SLOTS, MAX_LEVEL } from "@/lib/character";
import type { ClassId } from "@/lib/loot";
import { canEquip, canOffHand } from "@/lib/proficiency";
import { gearIndices, type WornItem } from "@/lib/worn";

/** Enough to fill a drawer several times over; short enough that a slot with
 *  nine hundred answers does not lay out nine hundred rows. The count says
 *  what was left behind, so the number is never a silent truncation. */
const CAP = 200;

/** The step between an item's level and the level it asks for.
 *
 *  1,870 of the dictionary's 10,532 rows carry no required level at all, and
 *  856 of those are level-40-and-up gear — a hole in the dump rather than a
 *  fact about the game, and a hole that would otherwise put Naxxramas at the
 *  top of a level 24's drawer. Where both numbers are present the difference
 *  is 5 on 6,332 rows out of 8,662, which is the game's own drop relationship,
 *  so a row with no required level is read at its item level minus five. */
const IMPLIED = 5;

/** The second hand, as a gear index. `gearIndices` sends every one-hander
 *  here as well as to the first, and only three classes may take it. */
const OFF_HAND = GEAR_SLOTS.indexOf("Off hand");

function asks(row: WornItem): number {
  return row.rl ?? Math.max(0, (row.il ?? 0) - IMPLIED);
}

let dict: Record<string, WornItem> | null = null;

async function load(): Promise<Record<string, WornItem>> {
  if (!dict) {
    const raw = await fs.readFile(path.join(process.cwd(), "reference", "items.json"), "utf8");
    dict = JSON.parse(raw) as Record<string, WornItem>;
  }
  return dict;
}

export async function GET(req: Request): Promise<NextResponse> {
  const q = new URL(req.url).searchParams;

  /* Absent is not zero. `Number(null)` is 0, which is a real slot, so a
     request with no `at` would quietly answer with Head. */
  const said = q.get("at");
  const at = said === null ? NaN : Number(said);
  if (!Number.isInteger(at) || at < 0 || at >= GEAR_SLOTS.length) {
    return NextResponse.json({ error: "slot" }, { status: 400 });
  }

  /* `in` walks the prototype, so `?cls=toString` would have named a class
     that is a function on Object. Own keys only. */
  const raw = q.get("cls");
  const cls: ClassId | null = raw && Object.hasOwn(CLASS_NAME, raw) ? (raw as ClassId) : null;

  const level = Math.min(MAX_LEVEL, Math.max(1, Number(q.get("level")) || 1));
  const find = (q.get("q") ?? "").trim().toLowerCase().slice(0, 40);

  const all = await load();
  const hits: { id: number; il: number; name: string }[] = [];

  for (const [id, row] of Object.entries(all)) {
    /* Dev leftovers. The one quality the game never shipped on a real item. */
    if (row.q === "Artifact") continue;
    if (!gearIndices(row.s).includes(at)) continue;
    if (asks(row) > level) continue;
    if (!canEquip(cls, level, row.s, row.sc)) continue;
    if (at === OFF_HAND && !canOffHand(cls, level, row.s, row.sc)) continue;
    if (find && !row.n.toLowerCase().includes(find)) continue;
    hits.push({ id: Number(id), il: row.il ?? row.rl ?? 0, name: row.n });
  }

  /* Planning first: the strongest thing this character could be wearing here
     is the first row. Name breaks the ties so the order never wobbles. */
  hits.sort((a, b) => b.il - a.il || a.name.localeCompare(b.name));

  const sent = hits.slice(0, CAP);
  const plate: Record<string, WornItem> = {};
  for (const h of sent) plate[h.id] = all[String(h.id)];

  return NextResponse.json(
    { ids: sent.map((h) => h.id), total: hits.length, plate },
    /* Short and then stale: an edge may hold it, a browser revalidates, and
       a change to the class table or the dictionary reaches a reader on
       their next press rather than tomorrow. */
    { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=2592000" } }
  );
}
