/* THE ATOM, TYPED. docs/PINS.md; the argument is docs/TARI.md §2.2.
 *
 * A pin is one person, standing in one spot, saying one thing — and it
 * stays. This file is the client-safe half: the shape, the caps, the wire
 * channel, and the reader for a pin that lands over Ably. The table read
 * lives in lib/pins-db.ts. */

import { wireName } from "./ably";
import type { ClassId } from "./types";

/** One thing, said once. */
export const PIN_MAX = 240;

/** Within this many levels of the reader, a pin stands at full strength;
 *  past it the mark quietens. Nothing is ever hidden (Kacey's ruling). */
export const PIN_BAND = 5;

/** How many threads a room hands over in one read. */
export const PIN_LIMIT = 200;

export type PinReply = {
  id: number;
  body: string;
  who: string;
  cls: ClassId;
  level: number;
  at: string;
  mine: boolean;
};

export type Pin = {
  id: number;
  /** Map coordinates, the spots files' own 0–100 space. */
  x: number;
  y: number;
  body: string;
  who: string;
  cls: ClassId;
  level: number;
  at: string;
  mine: boolean;
  replies: PinReply[];
};

/** Where a room's pins land the second they are said. The table is the
 *  history; this channel is only the moment. */
export function pinsChannel(room: string): string {
  return `${wireName(room)}::pins`;
}

/** A pin arriving over the wire is whatever another process published.
 *  Same doctrine as readWho: nothing downstream may assume a field exists
 *  because our own code put it there. `mine` is always false here — your
 *  own pin comes back from the POST, not the wire. */
export function readPin(v: unknown): (Pin & { parent: number | null }) | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  if (typeof p.id !== "number" || typeof p.body !== "string") return null;
  if (typeof p.x !== "number" || typeof p.y !== "number") return null;
  return {
    id: p.id,
    x: p.x,
    y: p.y,
    body: p.body.slice(0, PIN_MAX),
    who: typeof p.who === "string" ? p.who.slice(0, 24) : "someone",
    cls: (typeof p.cls === "string" ? p.cls : "warrior") as ClassId,
    level: typeof p.level === "number" ? p.level : 1,
    at: typeof p.at === "string" ? p.at : new Date().toISOString(),
    mine: false,
    replies: [],
    parent: typeof p.parent === "number" ? p.parent : null,
  };
}

/** A pin appreciates: fresh ones age in days, old ones wear their month
 *  like a date carved somewhere. */
export function pinAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 28) return `${days}d`;
  return new Date(iso).toLocaleDateString("en", { month: "short", year: "numeric" });
}
