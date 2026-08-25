/* The map plates: which rooms have one, what picture it is, and how the
 * marks land on it.
 *
 * A plate is an image plus a coordinate space. Pins arrive in 1.12 map
 * percent (pfQuest, via scripts/map-pins.py) and are placed through `reg`,
 * the affine that carries that space onto the picture. Fix the space once
 * and the art is swappable per zone with a file drop — PHASE-MAP-1 §3.
 *
 * SERVER ONLY. The pins are loaded by dynamic import rather than named at
 * the top of the file, so a room's marks are read when that room is asked
 * for instead of all forty-six zones riding along in the bundle. Anything
 * that runs in the browser takes its types and its URL from lib/plate.ts.
 */

import type { Area, PlateSpec, Pin, ZonePlate } from "./plate";

export type { Area, Pin, PinKind, PlateSpec, ZonePlate } from "./plate";
export { plateSrc } from "./plate";

/* The client's own sheet: 1002x668, twelve BLP tiles and one overlay per
 * subzone, composited by scripts/map-plates-client.py. It is the exact
 * space pfQuest records in, so the affine is the identity and nothing had
 * to be fitted. One width, because 1002px is all there is — the plate goes
 * soft past about 2x, and the fix is better art, not a bigger re-encode. */
const CLIENT: Omit<PlateSpec, "id"> = {
  widths: [1002],
  aspect: [1002, 668],
  reg: { sx: 1, ox: 0, sy: 1, oy: 0 },
};

/** Every vanilla zone and capital, minus the three below that have better
 *  art. A room absent from both lists has no map, and the room simply does
 *  not draw a compass. */
const FROM_CLIENT = [
  "stormwind-city", "ironforge", "darnassus", "orgrimmar", "thunder-bluff",
  "alterac-mountains", "arathi-highlands", "badlands", "blasted-lands",
  "burning-steppes", "deadwind-pass", "dun-morogh", "elwynn-forest",
  "hillsbrad-foothills", "loch-modan", "redridge-mountains", "searing-gorge",
  "silverpine-forest", "stranglethorn-vale", "swamp-of-sorrows",
  "the-hinterlands", "tirisfal-glades", "western-plaguelands", "westfall",
  "wetlands", "ashenvale", "azshara", "darkshore", "desolace", "durotar",
  "dustwallow-marsh", "felwood", "feralas", "moonglade", "mulgore",
  "silithus", "stonetalon-mountains", "tanaris", "teldrassil", "the-barrens",
  "thousand-needles", "un-goro-crater", "winterspring",
];

/* The three that have art of their own, sourced and upscaled to 4K. Each
 * one of these is what every plate above is waiting to become. */
const SOURCED: Record<string, PlateSpec> = {
  "eastern-plaguelands": {
    id: "eastern-plaguelands",
    widths: [2048, 3072, 4096],
    aspect: [4096, 2737],
    // This one is the Cataclysm-era illustration, whose map bounds differ
    // from 1.12's. Fitted on six landmarks (Light's Hope 81,59 → 75,52 and
    // so on); residuals under 1.6%.
    reg: { sx: 0.9468, ox: -1.29, sy: 0.9818, oy: -5.34 },
  },
  duskwood: {
    id: "duskwood",
    widths: [2048, 3072, 4096],
    aspect: [4096, 2737],
    // The 1.12 plate, upscaled: same framing, same bounds, so pfQuest
    // percent is plate percent and the affine is the identity.
    reg: { sx: 1, ox: 0, sy: 1, oy: 0 },
  },
  undercity: {
    id: "undercity",
    widths: [2048, 3072, 4096],
    aspect: [4096, 2737],
    // As Duskwood. The Royal Quarter sits below the drawn ring, on bare
    // parchment — that is where the client puts it too, not a bad fit.
    reg: { sx: 1, ox: 0, sy: 1, oy: 0 },
  },
};

const SPECS: Record<string, PlateSpec> = {
  ...SOURCED,
  ...Object.fromEntries(FROM_CLIENT.map((id) => [id, { id, ...CLIENT }])),
};

/** The plate, with its marks. The import is a variable path on purpose: the
 *  bundler turns lib/maps/*.json into one lazily-read group instead of
 *  forty-six eager ones. */
export async function plateFor(roomId: string): Promise<ZonePlate | undefined> {
  const spec = SPECS[roomId];
  if (!spec) return undefined;
  const loaded = await import(`./maps/${roomId}.json`);
  const data = ((loaded as { default?: unknown }).default ?? loaded) as {
    pins: Pin[];
    areas: Area[];
  };
  return { ...spec, pins: data.pins, areas: data.areas };
}
