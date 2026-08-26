/* THE LIVE LAYER, NAMED. docs/TARI.md §8.
 *
 * One file decides what a room is called on the wire, because four things
 * have to agree on it: the chat room, the space the cursors live in, the
 * REST call that counts heads in rooms nobody here has open, and the
 * capability the token hands out.
 *
 * Ably is the vendor, not Liveblocks. The argument is in the project note:
 * Liveblocks caps a room at 10 simultaneous connections on every plan you
 * would actually buy, and Tari's premise is one room per zone with all of
 * it standing inside. §8's own bar — 5–50 feels tight, 500 feels like a
 * gold mine — is unreachable there. Ably charges per message instead of
 * per seat, which is the shape this product is. */

import type { ClassId } from "./types";

/** Every channel Tari opens starts here, so the occupancy call can ask for
 *  all of them at once with a single prefix. */
export const NS = "tari:";

/** A room id (`duskwood`) as the wire says it. Chat hangs `::$chat` off
 *  this; Spaces hangs `::$space` and `::$cursors`. */
export function wireName(room: string): string {
  return NS + room;
}

/** …and back, from `tari:duskwood::$chat`. Null for anything not ours. */
export function roomFromWire(name: string): string | null {
  if (!name.startsWith(NS)) return null;
  const cut = name.indexOf("::");
  const id = name.slice(NS.length, cut === -1 ? undefined : cut);
  return id || null;
}

/** WHO YOU ARE TO EVERYONE ELSE. Deliberately small: this object rides
 *  every enter, every update and every presence heartbeat, and Ably bills
 *  by the message. The doll, the gear and the journal stay at home. */
export type Who = {
  name: string;
  cls: ClassId;
  level: number;
  race: number;
  faction: "alliance" | "horde";
  realm: string | null;
  guild?: string | null;
};

/** Presence data arrives as whatever the other browser felt like sending.
 *  Nothing downstream may assume a field exists because our own code put
 *  it there. */
export function readWho(v: unknown): Who | null {
  if (!v || typeof v !== "object") return null;
  const w = v as Record<string, unknown>;
  if (typeof w.name !== "string" || typeof w.cls !== "string") return null;
  return {
    name: w.name.slice(0, 24),
    cls: w.cls as ClassId,
    level: typeof w.level === "number" ? w.level : 1,
    race: typeof w.race === "number" ? w.race : 1,
    faction: w.faction === "horde" ? "horde" : "alliance",
    realm: typeof w.realm === "string" ? w.realm : null,
    guild: typeof w.guild === "string" ? w.guild : null,
  };
}

/** ABOVE THIS MANY PEOPLE, CURSORS STOP.
 *
 *  Two reasons, and they agree. Ably's own guidance is a maximum of 20
 *  members streaming cursors at once before the screen stops helping. And
 *  the bill is quadratic: every mover's batch fans out to every watcher, so
 *  a full Orgrimmar is N² messages a second for an effect nobody can read.
 *
 *  Which is also the right design. §8 says 5–50 feels like a tight
 *  community and 500 feels like a gold mine — those are different rooms
 *  wanting different things. Cursors are the tight-community end. A city
 *  keeps presence and chat, which is what a crowd is actually for. */
export const CURSOR_CAP = 24;

/** How often a browser publishes its cursor batch. Ably's default is 25ms;
 *  this is four times kinder and still reads as live, because the receiving
 *  end tweens between batches. */
export const CURSOR_BATCH_MS = 100;

/** How far back a room remembers out loud. Ably keeps the messages; this is
 *  how many are pulled when you walk in, so an empty zone still shows a
 *  conversation rather than a void. */
export const SCROLLBACK = 50;
