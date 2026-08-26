/**
 * AZEROTH AS A LIST.
 *
 * The rail is not a list of servers you joined (docs/TARI.md §11.2) — it is
 * the world, so the world has to exist somewhere as data. This is that file:
 * every room the art pipeline has shipped, and nothing it has not.
 *
 * `id` is the URL (`/r/duskwood`) and the art file
 * (`/journey/duskwood.webp`) at the same time. One string, so a room can
 * never half-exist: if the picture is missing the room is not here.
 *
 * What this file deliberately does not hold: level ranges, guide content,
 * adjacency. Those arrive with the pipeline's zone JSON (`lib/types.ts`),
 * and inventing them here would mean two sources of truth on the day the
 * real one lands.
 *
 * The rule held and the ranges arrived anyway. `lib/room-bands.ts` is
 * generated out of the same pipeline pass that writes the loot files, so the
 * bands this file now sorts by are read rather than invented — the rule was
 * against a second opinion, not against knowing. It is a separate module from
 * the loot for one reason: the rail is a client component, and importing
 * `loot-files.ts` to read one field per room would ship 2,320 items to
 * everybody who loads a sidebar.
 */

import { ROOM_BANDS, type Band } from "./room-bands";

/** Four kinds of room (§4.1), plus the towns and hubs the art shoot caught
 *  on the way past. A `place` is somewhere you stand that is not a zone. */
export type RoomKind = "city" | "zone" | "dungeon" | "raid" | "place";

export type Continent = "eastern-kingdoms" | "kalimdor";

export type Room = {
  id: string;
  name: string;
  kind: RoomKind;
  continent: Continent;
  /** A wing that has not been photographed yet borrows its building's
   *  picture. Absent means the room's own file, named by its id. */
  art?: string;
};

/** The order the rail draws its groups in: where people are, then where
 *  people go, then what they go there for. */
export const KIND_ORDER: RoomKind[] = ["city", "zone", "dungeon", "raid", "place"];

export const KIND_LABEL: Record<RoomKind, string> = {
  city: "Cities",
  zone: "Zones",
  dungeon: "Dungeons",
  raid: "Raids",
  place: "Places",
};

export const CONTINENT_LABEL: Record<Continent, string> = {
  "eastern-kingdoms": "Eastern Kingdoms",
  kalimdor: "Kalimdor",
};

const EK = "eastern-kingdoms" as const;
const KAL = "kalimdor" as const;

/** 75 rooms, one per file in `public/journey`. Every vanilla instance except
 *  Blackrock Spire, which was never shot — see that folder's README. */
export const ROOMS: Room[] = [
  { id: "stormwind-city", name: "Stormwind", kind: "city", continent: EK },
  { id: "ironforge", name: "Ironforge", kind: "city", continent: EK },
  { id: "undercity", name: "Undercity", kind: "city", continent: EK },
  { id: "darnassus", name: "Darnassus", kind: "city", continent: KAL },
  { id: "orgrimmar", name: "Orgrimmar", kind: "city", continent: KAL },
  { id: "thunder-bluff", name: "Thunder Bluff", kind: "city", continent: KAL },

  { id: "alterac-mountains", name: "Alterac Mountains", kind: "zone", continent: EK },
  { id: "arathi-highlands", name: "Arathi Highlands", kind: "zone", continent: EK },
  { id: "badlands", name: "Badlands", kind: "zone", continent: EK },
  { id: "blasted-lands", name: "Blasted Lands", kind: "zone", continent: EK },
  { id: "burning-steppes", name: "Burning Steppes", kind: "zone", continent: EK },
  { id: "deadwind-pass", name: "Deadwind Pass", kind: "zone", continent: EK },
  { id: "dun-morogh", name: "Dun Morogh", kind: "zone", continent: EK },
  { id: "duskwood", name: "Duskwood", kind: "zone", continent: EK },
  { id: "eastern-plaguelands", name: "Eastern Plaguelands", kind: "zone", continent: EK },
  { id: "elwynn-forest", name: "Elwynn Forest", kind: "zone", continent: EK },
  { id: "hillsbrad-foothills", name: "Hillsbrad Foothills", kind: "zone", continent: EK },
  { id: "loch-modan", name: "Loch Modan", kind: "zone", continent: EK },
  { id: "redridge-mountains", name: "Redridge Mountains", kind: "zone", continent: EK },
  { id: "searing-gorge", name: "Searing Gorge", kind: "zone", continent: EK },
  { id: "silverpine-forest", name: "Silverpine Forest", kind: "zone", continent: EK },
  { id: "stranglethorn-vale", name: "Stranglethorn Vale", kind: "zone", continent: EK },
  { id: "swamp-of-sorrows", name: "Swamp of Sorrows", kind: "zone", continent: EK },
  { id: "the-hinterlands", name: "The Hinterlands", kind: "zone", continent: EK },
  { id: "tirisfal-glades", name: "Tirisfal Glades", kind: "zone", continent: EK },
  { id: "western-plaguelands", name: "Western Plaguelands", kind: "zone", continent: EK },
  { id: "westfall", name: "Westfall", kind: "zone", continent: EK },
  { id: "wetlands", name: "Wetlands", kind: "zone", continent: EK },
  { id: "ashenvale", name: "Ashenvale", kind: "zone", continent: KAL },
  { id: "azshara", name: "Azshara", kind: "zone", continent: KAL },
  { id: "darkshore", name: "Darkshore", kind: "zone", continent: KAL },
  { id: "desolace", name: "Desolace", kind: "zone", continent: KAL },
  { id: "durotar", name: "Durotar", kind: "zone", continent: KAL },
  { id: "dustwallow-marsh", name: "Dustwallow Marsh", kind: "zone", continent: KAL },
  { id: "felwood", name: "Felwood", kind: "zone", continent: KAL },
  { id: "feralas", name: "Feralas", kind: "zone", continent: KAL },
  { id: "moonglade", name: "Moonglade", kind: "zone", continent: KAL },
  { id: "mulgore", name: "Mulgore", kind: "zone", continent: KAL },
  { id: "silithus", name: "Silithus", kind: "zone", continent: KAL },
  { id: "stonetalon-mountains", name: "Stonetalon Mountains", kind: "zone", continent: KAL },
  { id: "tanaris", name: "Tanaris", kind: "zone", continent: KAL },
  { id: "teldrassil", name: "Teldrassil", kind: "zone", continent: KAL },
  { id: "the-barrens", name: "The Barrens", kind: "zone", continent: KAL },
  { id: "thousand-needles", name: "Thousand Needles", kind: "zone", continent: KAL },
  { id: "un-goro-crater", name: "Un'Goro Crater", kind: "zone", continent: KAL },
  { id: "winterspring", name: "Winterspring", kind: "zone", continent: KAL },

  { id: "blackrock-depths", name: "Blackrock Depths", kind: "dungeon", continent: EK },
  { id: "lower-blackrock-spire", name: "Lower Blackrock Spire", kind: "dungeon", continent: EK, art: "blackrock-mountain" },
  { id: "upper-blackrock-spire", name: "Upper Blackrock Spire", kind: "dungeon", continent: EK, art: "blackrock-mountain" },
  { id: "gnomeregan", name: "Gnomeregan", kind: "dungeon", continent: EK },
  { id: "scarlet-monastery", name: "Scarlet Monastery", kind: "dungeon", continent: EK },
  { id: "scholomance", name: "Scholomance", kind: "dungeon", continent: EK },
  { id: "shadowfang-keep", name: "Shadowfang Keep", kind: "dungeon", continent: EK },
  { id: "stratholme", name: "Stratholme", kind: "dungeon", continent: EK },
  { id: "the-deadmines", name: "The Deadmines", kind: "dungeon", continent: EK },
  { id: "the-stockade", name: "The Stockade", kind: "dungeon", continent: EK },
  { id: "the-temple-of-atal-hakkar", name: "The Temple of Atal'Hakkar", kind: "dungeon", continent: EK },
  { id: "uldaman", name: "Uldaman", kind: "dungeon", continent: EK },
  { id: "blackfathom-deeps", name: "Blackfathom Deeps", kind: "dungeon", continent: KAL },
  { id: "dire-maul-east", name: "Dire Maul East", kind: "dungeon", continent: KAL, art: "dire-maul" },
  { id: "dire-maul-west", name: "Dire Maul West", kind: "dungeon", continent: KAL, art: "dire-maul" },
  { id: "dire-maul-north", name: "Dire Maul North", kind: "dungeon", continent: KAL, art: "dire-maul" },
  { id: "maraudon", name: "Maraudon", kind: "dungeon", continent: KAL },
  { id: "ragefire-chasm", name: "Ragefire Chasm", kind: "dungeon", continent: KAL },
  { id: "razorfen-downs", name: "Razorfen Downs", kind: "dungeon", continent: KAL },
  { id: "razorfen-kraul", name: "Razorfen Kraul", kind: "dungeon", continent: KAL },
  { id: "wailing-caverns", name: "Wailing Caverns", kind: "dungeon", continent: KAL },
  { id: "zul-farrak", name: "Zul'Farrak", kind: "dungeon", continent: KAL },

  { id: "molten-core", name: "Molten Core", kind: "raid", continent: EK },
  { id: "blackwing-lair", name: "Blackwing Lair", kind: "raid", continent: EK },
  { id: "naxxramas", name: "Naxxramas", kind: "raid", continent: EK },
  { id: "zul-gurub", name: "Zul'Gurub", kind: "raid", continent: EK },
  { id: "onyxia-s-lair", name: "Onyxia's Lair", kind: "raid", continent: KAL },
  { id: "ruins-of-ahn-qiraj", name: "Ruins of Ahn'Qiraj", kind: "raid", continent: KAL },
  { id: "ahn-qiraj", name: "Ahn'Qiraj", kind: "raid", continent: KAL },

  { id: "blackrock-mountain", name: "Blackrock Mountain", kind: "place", continent: EK },
  { id: "northshire", name: "Northshire", kind: "place", continent: EK },
  { id: "gadgetzan", name: "Gadgetzan", kind: "place", continent: KAL },
  { id: "ratchet", name: "Ratchet", kind: "place", continent: KAL },
];

/**
 * Where the door opens onto.
 *
 * Signing in on the landing page lands here, and so does anyone who asks for
 * a room that does not exist. Duskwood because `docs/SHELL.md` names it, and
 * because a first look at Tari should be a place with weather in it rather
 * than a capital city full of menus.
 *
 * One constant, so the answer to "where does a reader start" is in one file
 * on the day it stops being Duskwood.
 */
export const FIRST_ROOM = "/r/duskwood";

const BY_ID = new Map(ROOMS.map((room) => [room.id, room]));

export function getRoom(id: string): Room | undefined {
  return BY_ID.get(id);
}

/** The full-bleed ground: the shipped master, 52 KB to 528 KB. */
export function roomArt(id: string): string {
  return `/journey/${BY_ID.get(id)?.art ?? id}.webp`;
}

/** The rail's copy of the same picture, 500px wide. The rail draws all 75
 *  rooms at once — at full size that is 14 MB before the reader has clicked
 *  anything. Written by `scripts/rail-thumbs.mjs`. */
export function roomThumb(id: string): string {
  return `/journey/rail/${BY_ID.get(id)?.art ?? id}.webp`;
}

/** The rail's groups, in KIND_ORDER, each in the order written above —
 *  which is continent, then alphabetical inside it. */
/**
 * THE BAND, WHERE THERE IS ONE.
 *
 * Three of the five kinds have no useful answer and get null rather than a
 * number, because a wrong-looking figure on a row is worse than a bare name:
 *
 * A city states 1–60. True, and it means "any time" rather than "now" — it
 * would sort every capital into the middle of the list and print a range no
 * reader could act on.
 *
 * A raid states 60–63. The 63 is a boss's level, not a player's; every raid in
 * the game is level 60 content and printing three flavours of "60" beside them
 * would be the rail inventing a distinction the game does not make.
 *
 * A place — Ratchet, Northshire — has no band at all and should not grow one.
 *
 * Zones and dungeons are the two where the number is a real fact about where
 * you should be, and they are the two the rail sorts and labels.
 */
const BANDED: RoomKind[] = ["zone", "dungeon"];

export function bandOf(room: Room): Band | null {
  return BANDED.includes(room.kind) ? (ROOM_BANDS[room.id] ?? null) : null;
}

/** "20–30", en dash, or null. What a row prints beside its name. */
export function bandLabel(room: Room): string | null {
  const b = bandOf(room);
  return b ? `${b.min}–${b.max}` : null;
}

/**
 * The rail's groups, and for two of them the order the world is in rather than
 * the order the alphabet is.
 *
 * ALPHABETICAL WAS A LIST OF WORDS. It reads as an index — fine if you already
 * know that Duskwood is where a level 24 goes and that Badlands is not, which
 * is precisely the knowledge somebody opening this for the first time does not
 * have. Forty names with nothing but names on them asks the reader to bring the
 * map with them. The bands were sitting in the pipeline the whole time.
 *
 * CONTINENTS STAY WHOLE. Sorting all forty by level alone would put Elwynn,
 * Durotar, Dun Morogh, Mulgore and Tirisfal in one block, which answers "what
 * is for my level" and destroys the thing the rail actually is — Azeroth as a
 * list (§11.2), not a difficulty ladder. So each continent is a section and the
 * levels run bottom to top inside it. A reader sees where they are and what is
 * above it without having to hold the map themselves.
 *
 * Cities, raids and places keep the order they were written in. See bandOf for
 * why none of the three has a level worth sorting on.
 */
export type RailGroup = {
  kind: RoomKind;
  rooms: Room[];
  /** Split by continent, low band first, for the kinds that have one. Null
   *  when the group is one undivided list in its written order. */
  sections: { continent: Continent; rooms: Room[] }[] | null;
};

const CONTINENT_ORDER: Continent[] = ["eastern-kingdoms", "kalimdor"];

export function roomsByKind(): RailGroup[] {
  return KIND_ORDER.map((kind) => {
    const rooms = ROOMS.filter((room) => room.kind === kind);
    if (!BANDED.includes(kind)) return { kind, rooms, sections: null };

    const sections = CONTINENT_ORDER.map((continent) => ({
      continent,
      rooms: rooms
        .filter((room) => room.continent === continent)
        /* Low band first, widest last among equals — Ashenvale 18–30 sits
           under Stonetalon 16–26 and above Thousand Needles 26–34, which is
           the order you actually pass through them. A room the pipeline gave
           no band falls to the end rather than to the top, where a zero would
           put it. */
        .sort((a, b) => {
          const x = ROOM_BANDS[a.id];
          const y = ROOM_BANDS[b.id];
          if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1) || a.name.localeCompare(b.name);
          return x.min - y.min || x.max - y.max || a.name.localeCompare(b.name);
        }),
    })).filter((section) => section.rooms.length > 0);

    return { kind, rooms: sections.flatMap((s) => s.rooms), sections };
  });
}
