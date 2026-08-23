import type { ClassId, Faction, Item } from "./types";

/**
 * The side, as the app handles it.
 *
 * Faction is the third fact about a character, and it behaves like the other
 * two rather than like a setting: it rides the URL, it is stored beside class
 * and level, and it filters.
 *
 * It also has a mark now, and the mark is rationed: the picker where the side
 * is chosen, the profile bar where it is stated, and the quest rows one side
 * cannot walk. Everywhere else a faction is still a word in the meta register,
 * because a crest on every row is a crest that says nothing, and the colour
 * would start arguing with quality — the one colour system this app runs on.
 */

export const FACTIONS: Faction[] = ["alliance", "horde"];

/** Sentence case, everywhere it is written. Never uppercased, never a crest. */
export const FACTION_LABEL: Record<Faction, string> = {
  alliance: "Alliance",
  horde: "Horde",
};

/**
 * The two classes that answer the question by existing. A paladin is Alliance
 * and a shaman is Horde in this version of the game, so asking a paladin for a
 * side is asking a question the class already answered.
 *
 * Partial on purpose: the other seven are a real choice, and a class that gains
 * a side later (or loses one, which is what a later expansion did to both of
 * these) is one line here and nothing else.
 */
export const CLASS_FACTION: Partial<Record<ClassId, Faction>> = {
  paladin: "alliance",
  shaman: "horde",
};

export function isFaction(v: unknown): v is Faction {
  return v === "alliance" || v === "horde";
}

/**
 * What side this run is on, given the class and whatever the URL said.
 *
 * The class wins. Not as a courtesy to the picker on the landing — the lock
 * there is JavaScript, and a hand-typed `/paladin?side=horde` has to land
 * somewhere sensible without it. It lands on Alliance, because the alternative
 * is a screen filtered to quests a paladin cannot take.
 *
 * Null is a real answer and means the run has not said yet. It is not defaulted
 * to Alliance: a default would silently hide every Horde quest reward from
 * someone who never chose, and hiding on an unstated assumption is the one
 * failure mode this whole feature has. Unknown shows everything, and the
 * itinerary asks once. See components/faction-ask.tsx.
 */
export function resolveFaction(
  cls: ClassId,
  raw: string | undefined
): Faction | null {
  return CLASS_FACTION[cls] ?? (isFaction(raw) ? raw : null);
}

/**
 * Whether a source is open to this side.
 *
 * Two ways to be visible and both are stated: the source says `"both"`, or it
 * says your side. A source carrying no faction at all is the third case and it
 * shows — every quest source in the shipped files carries one, so this branch
 * is a guard rather than a path, and it is written this way because the two
 * failure modes are not symmetrical. Showing an item the player cannot get
 * wastes a row. Hiding one they can get is invisible: there is nothing on the
 * screen to notice.
 */
export function sourceVisible(
  source: { type: string; faction?: string },
  faction: Faction | null
): boolean {
  if (faction === null) return true;
  if (source.type !== "quest") return true;
  if (source.faction === undefined) return true;
  return source.faction === "both" || source.faction === faction;
}

/**
 * The filter, applied wherever sources are read.
 *
 * It returns items with their `sources` rewritten rather than items marked for
 * hiding, and that matters more than it looks: every line in the app is built
 * from `sources[0]` and closes with "+2 more". An item kept for its drop but
 * filtered of one quest has to lose that quest from its count as well as from
 * its line, or the row states the number of routes the *other* faction has.
 *
 * An item left with no sources is gone entirely. There is nothing honest to
 * render for an item whose only route belongs to the other side — not a row
 * with an empty source line, and certainly not a row that says "Alliance only",
 * which would be the app advertising things you cannot have.
 *
 * Drop sources pass through untouched: any character can kill any creature, so
 * a drop is never gated and SCHEMA.md does not put the field on one.
 */
export function applyFaction(items: Item[], faction: Faction | null): Item[] {
  if (faction === null) return items;

  const out: Item[] = [];
  for (const item of items) {
    const sources = item.sources.filter((s) => sourceVisible(s, faction));
    if (sources.length === 0) continue;
    out.push(sources.length === item.sources.length ? item : { ...item, sources });
  }
  return out;
}

/**
 * The side a quest keeps to itself, if it keeps to one.
 *
 * Read off the source rather than off the run, which is what makes it true in
 * both directions: with a side chosen, applyFaction has already dropped the
 * other faction's routes, so a specific faction here can only be the player's
 * own. With no side chosen the app is showing both, and a source that names a
 * faction is naming the one condition on getting the item.
 *
 * `"both"` returns null and the row says nothing. The mark means "your side
 * only", which is information; on every quest in the game it would be
 * wallpaper.
 */
export function exclusiveFaction(item: Item): Faction | null {
  for (const s of item.sources) {
    if (s.type === "quest" && isFaction(s.faction)) return s.faction;
  }
  return null;
}

/**
 * The side as a query fragment, for the links that carry the run between
 * screens. Empty when the side is unknown, so an unanswered run never gets a
 * side written into its URL by a link it followed.
 */
export function sideParam(faction: Faction | null): string {
  return faction ? `&side=${faction}` : "";
}
