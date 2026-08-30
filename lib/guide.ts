/* THE GUIDE. docs/TARI.md §6: not more information, the 1% worth a card —
 * and since the night road, not a card at all. Every entry is an ENCOUNTER:
 * a thing from the game, staged on the road the telling draws. No entry is
 * a paragraph; each carries at most a few short lines, and a form that says
 * what kind of object delivers them.
 *
 * Hand-written, one file per room in reference/guide/, sourced from
 * CC BY-SA wiki pages (§6.3) and rewritten. Nothing generated. The icons
 * are the client's own, pulled the way the pin's treasure map was
 * (Kacey: the app should feel like the world). A room with no file has no
 * guide, and shows nothing.
 *
 * The spoiler shield (§6.1) is a grave: a spoiler encounter is a tombstone
 * on the road, and the reader digs it up by hand. */

import duskwood from "../reference/guide/duskwood.json";
import undercity from "../reference/guide/undercity.json";

export type CardKind = "notice" | "look" | "story" | "before" | "beware";

export const KIND_EYEBROW: Record<CardKind, string> = {
  notice: "Nobody notices this",
  look: "Go look at this",
  story: "The story here",
  before: "Before",
  beware: "It will kill you",
};

/** What kind of object delivers an encounter.
 *  - title: the zone's own name, decaying — the opener
 *  - chip:  a glass chip wearing a real client icon
 *  - grave: a tombstone on the road; dug up by hand (the spoiler shield)
 *  - yell:  a zone-wide monster yell, typed in red — Stitches
 *  - pages: torn pages, flipped one at a time — the Legend of Stalvan
 *  - six:   the rares' roll-call; the diamonds answer for themselves */
export type CardForm = "title" | "chip" | "grave" | "yell" | "pages" | "six";

/** A pin the guide leaves as an example of what a reader might — signed by
 *  Tari, never by an invented player. */
export type Seed = { body: string };

export type Card = {
  id: string;
  kind: CardKind;
  form: CardForm;
  /** What the encounter is, set large: a name, a place. */
  subject: string;
  /** The unit-frame line under the name: what kind of thing this is. */
  tag: string;
  /** At most three short lines. Never a paragraph. */
  lines: string[];
  spoiler: boolean;
  /** The client icon this object wears, from /public/story/<room>/. */
  icon?: string;
  /** Where on the road it stands, 0 (west end) to 1 (east end). Absent for
   *  the opener and the roll-call, which own the whole stage. */
  t?: number;
  /** A place off the road hangs from a drawn branch: up is north. */
  side?: "up" | "down";
  /** The one line a yell encounter screams across the zone. */
  yell?: string;
  /** A pages encounter's leaves, each a few short lines. */
  pages?: string[][];
  /** Where this happens in 1.12 map percent — the "open the map here"
   *  door. The telling itself draws no map. */
  at?: [number, number];
  seed?: Seed;
};

/** One rare: its spot on the road, its client icon, its two lines.
 *
 *  `t` IS A PLACE IN THE TELLING, NEVER A PLACE ON THE MAP. A Card may carry
 *  `at` and open the map there; a Rare may not, and must never be given one.
 *  Six named things with fixed haunts and coordinates beside them is a farming
 *  route, and docs/TARI.md §2.1 refuses routes. The roll-call is a reason to
 *  walk the zone, not a way to skip walking it. */
export type Rare = { name: string; icon: string; t: number; lines: string[] };

export type GuideFile = {
  room: string;
  sources: string[];
  cards: Card[];
  /** The road itself, in map percent — drawn as its own silhouette. */
  road?: [number, number][];
  /** What the road runs between, for the labels at its ends. */
  roadEnds?: [string, string];
  rares?: Rare[];
  /** Who signs the seeds. Always Tari today; the field keeps it honest. */
  seedWho?: string;
};

const GUIDES: Record<string, GuideFile> = {
  duskwood: duskwood as GuideFile,
  undercity: undercity as GuideFile,
};

export function guideFor(roomId: string): GuideFile | undefined {
  return GUIDES[roomId];
}
