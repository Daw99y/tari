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
 */

/** Four kinds of room (§4.1), plus the towns and hubs the art shoot caught
 *  on the way past. A `place` is somewhere you stand that is not a zone. */
export type RoomKind = "city" | "zone" | "dungeon" | "raid" | "place";

export type Continent = "eastern-kingdoms" | "kalimdor";

export type Room = {
  id: string;
  name: string;
  kind: RoomKind;
  continent: Continent;
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
  { id: "dire-maul", name: "Dire Maul", kind: "dungeon", continent: KAL },
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

const BY_ID = new Map(ROOMS.map((room) => [room.id, room]));

export function getRoom(id: string): Room | undefined {
  return BY_ID.get(id);
}

/** The full-bleed ground: the shipped master, 52 KB to 528 KB. */
export function roomArt(id: string): string {
  return `/journey/${id}.webp`;
}

/** The rail's copy of the same picture, 500px wide. The rail draws all 75
 *  rooms at once — at full size that is 14 MB before the reader has clicked
 *  anything. Written by `scripts/rail-thumbs.mjs`. */
export function roomThumb(id: string): string {
  return `/journey/rail/${id}.webp`;
}

/** The rail's groups, in KIND_ORDER, each in the order written above —
 *  which is continent, then alphabetical inside it. */
export function roomsByKind(): { kind: RoomKind; rooms: Room[] }[] {
  return KIND_ORDER.map((kind) => ({
    kind,
    rooms: ROOMS.filter((room) => room.kind === kind),
  }));
}
