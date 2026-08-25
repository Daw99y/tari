/* What a plate is, and where its picture lives.
 *
 * Split out of lib/maps.ts, which holds the plates themselves. ZoneMap is a
 * client component and needs the shape and the URL; if it reached into
 * lib/maps.ts for them it would drag every zone's pins into the browser
 * bundle behind them. Forty-six zones of pins is about 900 KB, shipped to
 * every reader on every page, for one zone's worth of marks. So the types
 * and the one pure function live here, with no data behind them, and
 * lib/maps.ts stays on the server. */

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

/** The picture and the coordinate space, without the marks on it. */
export type PlateSpec = {
  /** Room id, and the plate's file stem under /public/maps. */
  id: string;
  widths: number[];
  aspect: [number, number];
  /** 1.12 map percent → plate percent. */
  reg: { sx: number; ox: number; sy: number; oy: number };
};

export type ZonePlate = PlateSpec & {
  pins: Pin[];
  areas: Area[];
};

export function plateSrc(plate: PlateSpec, width: number): string {
  return `/maps/${plate.id}-${width}.webp`;
}
