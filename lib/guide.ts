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

import alteracMountains from "../reference/guide/alterac-mountains.json";
import arathiHighlands from "../reference/guide/arathi-highlands.json";
import ashenvale from "../reference/guide/ashenvale.json";
import azshara from "../reference/guide/azshara.json";
import badlands from "../reference/guide/badlands.json";
import blackfathomDeeps from "../reference/guide/blackfathom-deeps.json";
import blackrockDepths from "../reference/guide/blackrock-depths.json";
import blastedLands from "../reference/guide/blasted-lands.json";
import burningSteppes from "../reference/guide/burning-steppes.json";
import darkshore from "../reference/guide/darkshore.json";
import darnassus from "../reference/guide/darnassus.json";
import desolace from "../reference/guide/desolace.json";
import dunMorogh from "../reference/guide/dun-morogh.json";
import durotar from "../reference/guide/durotar.json";
import duskwood from "../reference/guide/duskwood.json";
import dustwallowMarsh from "../reference/guide/dustwallow-marsh.json";
import elwynnForest from "../reference/guide/elwynn-forest.json";
import felwood from "../reference/guide/felwood.json";
import feralas from "../reference/guide/feralas.json";
import gnomeregan from "../reference/guide/gnomeregan.json";
import hillsbradFoothills from "../reference/guide/hillsbrad-foothills.json";
import ironforge from "../reference/guide/ironforge.json";
import lochModan from "../reference/guide/loch-modan.json";
import maraudon from "../reference/guide/maraudon.json";
import moonglade from "../reference/guide/moonglade.json";
import mulgore from "../reference/guide/mulgore.json";
import orgrimmar from "../reference/guide/orgrimmar.json";
import ragefireChasm from "../reference/guide/ragefire-chasm.json";
import razorfenDowns from "../reference/guide/razorfen-downs.json";
import razorfenKraul from "../reference/guide/razorfen-kraul.json";
import redridgeMountains from "../reference/guide/redridge-mountains.json";
import scarletMonastery from "../reference/guide/scarlet-monastery.json";
import searingGorge from "../reference/guide/searing-gorge.json";
import shadowfangKeep from "../reference/guide/shadowfang-keep.json";
import silverpineForest from "../reference/guide/silverpine-forest.json";
import stonetalonMountains from "../reference/guide/stonetalon-mountains.json";
import stormwindCity from "../reference/guide/stormwind-city.json";
import stranglethornVale from "../reference/guide/stranglethorn-vale.json";
import swampOfSorrows from "../reference/guide/swamp-of-sorrows.json";
import tanaris from "../reference/guide/tanaris.json";
import teldrassil from "../reference/guide/teldrassil.json";
import theBarrens from "../reference/guide/the-barrens.json";
import theDeadmines from "../reference/guide/the-deadmines.json";
import theHinterlands from "../reference/guide/the-hinterlands.json";
import theStockade from "../reference/guide/the-stockade.json";
import theTempleOfAtalHakkar from "../reference/guide/the-temple-of-atal-hakkar.json";
import thousandNeedles from "../reference/guide/thousand-needles.json";
import thunderBluff from "../reference/guide/thunder-bluff.json";
import tirisfalGlades from "../reference/guide/tirisfal-glades.json";
import uldaman from "../reference/guide/uldaman.json";
import unGoroCrater from "../reference/guide/un-goro-crater.json";
import undercity from "../reference/guide/undercity.json";
import wailingCaverns from "../reference/guide/wailing-caverns.json";
import westfall from "../reference/guide/westfall.json";
import wetlands from "../reference/guide/wetlands.json";
import zulFarrak from "../reference/guide/zul-farrak.json";
import zulGurub from "../reference/guide/zul-gurub.json";

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
  /** TITLE CARDS ONLY. What the place is called now, when it was called
   *  something else first. Three of the four rooms written so far were:
   *  Brightwood, Lordaeron, Silverlaine Keep. `subject` holds the old name
   *  and this holds the one on the map, and the head sets the pair as a pair.
   *  Absent when a room was never renamed — Zul'Gurub has always been
   *  Zul'Gurub — and then the title is drawn plainly, with nothing struck. */
  now?: string;
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

/* Four rooms, one per kind: a zone, a city, a dungeon and a raid (TARI.md
 * §4.1). The two instances carry no `road`, no `at` on any card and no map —
 * a dungeon has no plate and never will, which is why Story takes an optional
 * one. `t` still orders the deck; it is a place in the telling, not a place on
 * a map (lib/guide.ts, `Rare`). */
const GUIDES: Record<string, GuideFile> = {
  duskwood: duskwood as GuideFile,
  undercity: undercity as GuideFile,
  "shadowfang-keep": shadowfangKeep as GuideFile,
  "zul-gurub": zulGurub as GuideFile,
  "stormwind-city": stormwindCity as GuideFile,
  ironforge: ironforge as GuideFile,
  orgrimmar: orgrimmar as GuideFile,
  "thunder-bluff": thunderBluff as GuideFile,
  darnassus: darnassus as GuideFile,
  "elwynn-forest": elwynnForest as GuideFile,
  "dun-morogh": dunMorogh as GuideFile,
  teldrassil: teldrassil as GuideFile,
  durotar: durotar as GuideFile,
  mulgore: mulgore as GuideFile,
  "tirisfal-glades": tirisfalGlades as GuideFile,
  darkshore: darkshore as GuideFile,
  "loch-modan": lochModan as GuideFile,
  "silverpine-forest": silverpineForest as GuideFile,
  westfall: westfall as GuideFile,
  "the-barrens": theBarrens as GuideFile,
  "ragefire-chasm": ragefireChasm as GuideFile,
  "the-deadmines": theDeadmines as GuideFile,
  "redridge-mountains": redridgeMountains as GuideFile,
  "stonetalon-mountains": stonetalonMountains as GuideFile,
  ashenvale: ashenvale as GuideFile,
  "wailing-caverns": wailingCaverns as GuideFile,
  "hillsbrad-foothills": hillsbradFoothills as GuideFile,
  wetlands: wetlands as GuideFile,
  "blackfathom-deeps": blackfathomDeeps as GuideFile,
  "razorfen-kraul": razorfenKraul as GuideFile,
  "the-stockade": theStockade as GuideFile,
  "thousand-needles": thousandNeedles as GuideFile,
  gnomeregan: gnomeregan as GuideFile,
  "alterac-mountains": alteracMountains as GuideFile,
  "arathi-highlands": arathiHighlands as GuideFile,
  desolace: desolace as GuideFile,
  "stranglethorn-vale": stranglethornVale as GuideFile,
  "scarlet-monastery": scarletMonastery as GuideFile,
  badlands: badlands as GuideFile,
  "dustwallow-marsh": dustwallowMarsh as GuideFile,
  "swamp-of-sorrows": swampOfSorrows as GuideFile,
  "razorfen-downs": razorfenDowns as GuideFile,
  uldaman: uldaman as GuideFile,
  feralas: feralas as GuideFile,
  tanaris: tanaris as GuideFile,
  "the-hinterlands": theHinterlands as GuideFile,
  "searing-gorge": searingGorge as GuideFile,
  "zul-farrak": zulFarrak as GuideFile,
  azshara: azshara as GuideFile,
  "blasted-lands": blastedLands as GuideFile,
  maraudon: maraudon as GuideFile,
  felwood: felwood as GuideFile,
  "un-goro-crater": unGoroCrater as GuideFile,
  "the-temple-of-atal-hakkar": theTempleOfAtalHakkar as GuideFile,
  "blackrock-depths": blackrockDepths as GuideFile,
  "burning-steppes": burningSteppes as GuideFile,
  moonglade: moonglade as GuideFile,
};

export function guideFor(roomId: string): GuideFile | undefined {
  return GUIDES[roomId];
}
