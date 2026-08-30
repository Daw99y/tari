/* PINS. docs/PINS.md.
 *
 * GET is public — a stranger reads the record exactly as a member does.
 * POST is the one deliberate exception to auth.ts's doctrine: writing to
 * the permanent record requires being on it, so signed out is 401. The
 * character facts ride in from the browser and are a claim, the same claim
 * a name in presence is (app/api/ably/route.ts); the uid underneath is not.
 *
 * A SPOT IS OPTIONAL (2026-08-30). Thirty-three rooms have no map plate and
 * never will — every dungeon, every raid, four hubs — so under a required
 * x/y the product's own atom was out of reach of exactly the places people
 * most want to warn each other about. A pin posted with x and y stands on
 * the map; a pin posted without them is left in the room's card stack and
 * lives only there. Half a spot is not a spot and is refused.
 *
 * DELETE is a tombstone, own pins only. Rows never leave the table.
 *
 * A landed pin is also published on `tari:<room>::pins` so every open map
 * watches it arrive. The table is the history; Ably is only the moment —
 * if the publish fails, the pin still stands. */

import * as Ably from "ably";

import { auth, hasAuth } from "@/lib/auth";
import { hasDb, query } from "@/lib/db";
import { PIN_MAX, pinsChannel } from "@/lib/pins";
import { pinsIn } from "@/lib/pins-db";
import { getRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const PER_WINDOW = 10;
const hits = new Map<number, number[]>();

function limited(uid: number): boolean {
  const now = Date.now();
  const seen = (hits.get(uid) ?? []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  hits.set(uid, seen);
  return seen.length > PER_WINDOW;
}

async function uid(): Promise<number | null> {
  if (!hasAuth()) return null;
  const session = (await auth()) as { uid?: number | null } | null;
  return typeof session?.uid === "number" ? session.uid : null;
}

/* One REST handle per process, same shape as the db pool. */
const holder = globalThis as unknown as { __tariAblyRest?: Ably.Rest };
function land(room: string, wire: unknown) {
  const key = process.env.ABLY_API_KEY;
  if (!key) return;
  try {
    holder.__tariAblyRest ??= new Ably.Rest(key);
    void holder.__tariAblyRest.channels.get(pinsChannel(room)).publish("pin", wire);
  } catch {
    /* The moment is lost; the pin is not. */
  }
}

export async function GET(req: Request) {
  if (!hasDb()) return Response.json({ pins: [] });
  const room = new URL(req.url).searchParams.get("room") ?? "";
  if (!getRoom(room)) return Response.json({ error: "no such room" }, { status: 404 });
  return Response.json({ pins: await pinsIn(room, await uid()) });
}

export async function POST(req: Request) {
  if (!hasDb()) return Response.json({ error: "no record" }, { status: 404 });
  const user = await uid();
  if (user === null) return Response.json({ error: "sign in" }, { status: 401 });
  if (limited(user)) return Response.json({ error: "later" }, { status: 429 });

  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad body" }, { status: 400 });
  }

  const room = typeof b.room === "string" ? b.room : "";
  const body = typeof b.body === "string" ? b.body.trim().slice(0, PIN_MAX) : "";
  const spotted = typeof b.x === "number" || typeof b.y === "number";
  const x = typeof b.x === "number" ? b.x : null;
  const y = typeof b.y === "number" ? b.y : null;
  const parent = typeof b.parent === "number" ? b.parent : null;
  const c = (b.who ?? {}) as Record<string, unknown>;
  const who = typeof c.name === "string" ? c.name.trim().slice(0, 24) : "";
  const cls = typeof c.cls === "string" ? c.cls : "";
  const level = typeof c.level === "number" ? Math.min(60, Math.max(1, Math.round(c.level))) : 0;

  if (!getRoom(room)) return Response.json({ error: "no such room" }, { status: 404 });
  if (!body || !who || !cls || !level) return Response.json({ error: "bad pin" }, { status: 400 });
  if (spotted && !(x !== null && y !== null && x >= 0 && x <= 100 && y >= 0 && y <= 100))
    return Response.json({ error: "off the map" }, { status: 400 });

  /* A reply stands where its pin stands — including nowhere — and one level
     deep only. */
  let px = x;
  let py = y;
  if (parent !== null) {
    const head = await query<{ x: number | null; y: number | null; parent: string | null; room: string }>(
      `select x, y, parent, room from pins where id = $1 and removed_at is null`,
      [parent]
    );
    const h = head?.[0];
    if (!h || h.room !== room || h.parent !== null)
      return Response.json({ error: "no such thread" }, { status: 400 });
    px = h.x;
    py = h.y;
  }

  const rows = await query<{ id: string; created_at: Date | string }>(
    `insert into pins (room, x, y, body, parent, user_id, who, cls, level)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id, created_at`,
    [room, px, py, body, parent, user, who, cls, level]
  );
  const row = rows?.[0];
  if (!row) return Response.json({ error: "no record" }, { status: 500 });

  const pin = {
    id: Number(row.id),
    x: px,
    y: py,
    body,
    who,
    cls,
    level,
    at: new Date(row.created_at).toISOString(),
    parent,
  };
  land(room, pin);
  return Response.json({ pin: { ...pin, mine: true, replies: [] } });
}

export async function DELETE(req: Request) {
  if (!hasDb()) return Response.json({ error: "no record" }, { status: 404 });
  const user = await uid();
  if (user === null) return Response.json({ error: "sign in" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  const rows = await query<{ id: string }>(
    `update pins set removed_at = now()
      where id = $1 and user_id = $2 and removed_at is null
      returning id`,
    [id, user]
  );
  if (!rows?.[0]) return Response.json({ error: "not yours" }, { status: 404 });
  return Response.json({ ok: true });
}
