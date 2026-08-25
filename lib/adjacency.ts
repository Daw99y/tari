/* WHAT IS NEXT DOOR. docs/TARI.md §4.1: presence rolls up and adjacency is
 * shown, so a quiet dungeon points to the zone outside it instead of
 * rendering a zero.
 *
 * Hand-written from the 1.12 map; the pipeline does not carry borders.
 * For a zone, the zones that share a border with it (and the city or hub
 * inside it). For an instance, a city or a place, the first entry is the
 * room it stands in — that is where its presence rolls up to. */

import { getRoom, type Room } from "./rooms";

const NEXT: Record<string, string[]> = {
  // Eastern Kingdoms
  "alterac-mountains": ["hillsbrad-foothills", "western-plaguelands"],
  "arathi-highlands": ["hillsbrad-foothills", "wetlands", "the-hinterlands"],
  badlands: ["loch-modan", "searing-gorge", "uldaman"],
  "blasted-lands": ["swamp-of-sorrows"],
  "burning-steppes": ["redridge-mountains", "blackrock-mountain", "searing-gorge"],
  "deadwind-pass": ["duskwood", "swamp-of-sorrows"],
  "dun-morogh": ["ironforge", "loch-modan", "gnomeregan"],
  duskwood: ["elwynn-forest", "westfall", "redridge-mountains", "stranglethorn-vale", "deadwind-pass"],
  "eastern-plaguelands": ["western-plaguelands", "stratholme", "naxxramas"],
  "elwynn-forest": ["stormwind-city", "northshire", "westfall", "duskwood", "redridge-mountains"],
  "hillsbrad-foothills": ["silverpine-forest", "alterac-mountains", "arathi-highlands"],
  "loch-modan": ["dun-morogh", "wetlands", "badlands", "searing-gorge"],
  "redridge-mountains": ["elwynn-forest", "duskwood", "burning-steppes"],
  "searing-gorge": ["badlands", "loch-modan", "blackrock-mountain", "burning-steppes"],
  "silverpine-forest": ["tirisfal-glades", "hillsbrad-foothills", "shadowfang-keep"],
  "stranglethorn-vale": ["duskwood", "zul-gurub"],
  "swamp-of-sorrows": ["blasted-lands", "deadwind-pass", "the-temple-of-atal-hakkar"],
  "the-hinterlands": ["arathi-highlands", "western-plaguelands"],
  "tirisfal-glades": ["undercity", "silverpine-forest", "western-plaguelands", "scarlet-monastery"],
  "western-plaguelands": ["tirisfal-glades", "eastern-plaguelands", "the-hinterlands", "alterac-mountains", "scholomance"],
  westfall: ["elwynn-forest", "duskwood", "the-deadmines"],
  wetlands: ["loch-modan", "arathi-highlands"],
  // Kalimdor
  ashenvale: ["darkshore", "felwood", "the-barrens", "stonetalon-mountains", "azshara", "blackfathom-deeps"],
  azshara: ["ashenvale"],
  darkshore: ["teldrassil", "ashenvale", "felwood"],
  desolace: ["stonetalon-mountains", "feralas", "maraudon"],
  durotar: ["orgrimmar", "the-barrens"],
  "dustwallow-marsh": ["the-barrens", "onyxia-s-lair"],
  felwood: ["ashenvale", "winterspring", "moonglade", "darkshore"],
  feralas: ["desolace", "thousand-needles", "dire-maul-east", "dire-maul-west", "dire-maul-north"],
  moonglade: ["felwood", "winterspring"],
  mulgore: ["thunder-bluff", "the-barrens"],
  silithus: ["un-goro-crater", "ahn-qiraj", "ruins-of-ahn-qiraj"],
  "stonetalon-mountains": ["ashenvale", "desolace", "the-barrens"],
  tanaris: ["gadgetzan", "thousand-needles", "un-goro-crater", "zul-farrak"],
  teldrassil: ["darnassus", "darkshore"],
  "the-barrens": ["ratchet", "durotar", "mulgore", "ashenvale", "stonetalon-mountains", "dustwallow-marsh", "thousand-needles", "wailing-caverns", "razorfen-kraul", "razorfen-downs"],
  "thousand-needles": ["the-barrens", "feralas", "tanaris"],
  "un-goro-crater": ["tanaris", "silithus"],
  winterspring: ["felwood", "moonglade"],
  // Cities: the zone outside the gate.
  "stormwind-city": ["elwynn-forest", "the-stockade"],
  ironforge: ["dun-morogh"],
  undercity: ["tirisfal-glades"],
  darnassus: ["teldrassil"],
  orgrimmar: ["durotar", "ragefire-chasm"],
  "thunder-bluff": ["mulgore"],
  // Places.
  "blackrock-mountain": ["searing-gorge", "burning-steppes", "blackrock-depths", "lower-blackrock-spire", "upper-blackrock-spire", "molten-core", "blackwing-lair"],
  northshire: ["elwynn-forest"],
  gadgetzan: ["tanaris"],
  ratchet: ["the-barrens"],
  // Dungeons: the room outside the portal.
  "blackrock-depths": ["blackrock-mountain"],
  "lower-blackrock-spire": ["blackrock-mountain"],
  "upper-blackrock-spire": ["blackrock-mountain"],
  gnomeregan: ["dun-morogh"],
  "scarlet-monastery": ["tirisfal-glades"],
  scholomance: ["western-plaguelands"],
  "shadowfang-keep": ["silverpine-forest"],
  stratholme: ["eastern-plaguelands"],
  "the-deadmines": ["westfall"],
  "the-stockade": ["stormwind-city"],
  "the-temple-of-atal-hakkar": ["swamp-of-sorrows"],
  uldaman: ["badlands"],
  "blackfathom-deeps": ["ashenvale"],
  "dire-maul-east": ["feralas"],
  "dire-maul-west": ["feralas"],
  "dire-maul-north": ["feralas"],
  maraudon: ["desolace"],
  "ragefire-chasm": ["orgrimmar"],
  "razorfen-downs": ["the-barrens"],
  "razorfen-kraul": ["the-barrens"],
  "wailing-caverns": ["the-barrens"],
  "zul-farrak": ["tanaris"],
  // Raids.
  "molten-core": ["blackrock-mountain"],
  "blackwing-lair": ["blackrock-mountain"],
  naxxramas: ["eastern-plaguelands"],
  "zul-gurub": ["stranglethorn-vale"],
  "onyxia-s-lair": ["dustwallow-marsh"],
  "ruins-of-ahn-qiraj": ["silithus"],
  "ahn-qiraj": ["silithus"],
};

/** The rooms next door, in the order written above. Unknown ids are dropped
    so a typo here can never draw a dead link. */
export function nextDoor(id: string): Room[] {
  return (NEXT[id] ?? []).map(getRoom).filter((r): r is Room => !!r);
}

/** For an instance, city or place: the room it stands in. For a zone,
    nothing — a zone is already outside. */
export function outside(id: string): Room | undefined {
  const room = getRoom(id);
  if (!room || room.kind === "zone") return undefined;
  return nextDoor(id)[0];
}
