/* The map plates, and what stands on them.
 *
 * A plate is an image plus a coordinate space. Pins arrive in 1.12 map
 * percent (pfQuest, the CPLUS dump) and are placed through `reg`, the affine
 * that carries that space onto the plate. Fix the space once and the art is
 * swappable per zone with a file drop — PHASE-MAP-1 §3. */

import duskwood from "./maps/duskwood.json";
import easternPlaguelands from "./maps/eastern-plaguelands.json";
import undercity from "./maps/undercity.json";

export type PinKind = "giver" | "turnin" | "rare";

export type Pin = {
  id: number;
  name: string;
  kind: PinKind;
  lvl: [number, number];
  x: number;
  y: number;
  quests: { id: number; title: string; lvl: number }[];
};

export type Area = { quest: number; title: string; name: string; points: [number, number][] };

export type ZonePlate = {
  /** Room id, and the plate's file stem under /public/maps. */
  id: string;
  widths: number[];
  aspect: [number, number];
  /** 1.12 map percent → plate percent. */
  reg: { sx: number; ox: number; sy: number; oy: number };
  pins: Pin[];
  areas: Area[];
};

const PLATES: Record<string, ZonePlate> = {
  "eastern-plaguelands": {
    id: "eastern-plaguelands",
    widths: [2048, 3072, 4096],
    aspect: [4096, 2737],
    // The 4K plate is the Cataclysm-era illustration, whose map bounds differ
    // from 1.12's. Fitted on six landmarks (Light's Hope 81,59 → 75,52 and so
    // on); residuals under 1.6%.
    reg: { sx: 0.9468, ox: -1.29, sy: 0.9818, oy: -5.34 },
    pins: easternPlaguelands.pins as unknown as Pin[],
    areas: easternPlaguelands.areas as unknown as Area[],
  },
  duskwood: {
    id: "duskwood",
    widths: [2048, 3072, 4096],
    aspect: [4096, 2737],
    // The 1.12 plate, upscaled: same framing, same bounds, so pfQuest
    // percent is plate percent and the affine is the identity.
    reg: { sx: 1, ox: 0, sy: 1, oy: 0 },
    pins: duskwood.pins as unknown as Pin[],
    areas: duskwood.areas as unknown as Area[],
  },
  undercity: {
    id: "undercity",
    widths: [2048, 3072, 4096],
    aspect: [4096, 2737],
    // As Duskwood. The Royal Quarter sits below the drawn ring, on bare
    // parchment — that is where the client puts it too, not a bad fit.
    reg: { sx: 1, ox: 0, sy: 1, oy: 0 },
    pins: undercity.pins as unknown as Pin[],
    areas: undercity.areas as unknown as Area[],
  },
};

export function plateFor(roomId: string): ZonePlate | undefined {
  return PLATES[roomId];
}

export function plateSrc(plate: ZonePlate, width: number): string {
  return `/maps/${plate.id}-${width}.webp`;
}
