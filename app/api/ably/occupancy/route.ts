/* HOW MANY, EVERYWHERE. docs/TARI.md §4.1: presence rolls up and adjacency
 * is shown, so a quiet dungeon points next door.
 *
 * The room you are standing in counts itself — its presence set is already
 * open. This is for the rooms you are *not* in: the ones the people column
 * offers as next door, and eventually the rail's 75. Subscribing to 75
 * channels to draw 75 numbers would be absurd.
 *
 * TWO STEPS, AND THE FIRST ONE IS WHY. Ably's channel enumeration answers
 * `GET /channels?prefix=tari:` with a list of *names* — the `by=value`
 * form that carries occupancy metrics inline is not served on every plan,
 * and asking for it silently gets you names anyway, which is a `{}` and a
 * lost afternoon. So enumeration is used for the only thing it reliably
 * does: say which rooms are alive at all. That list is short by
 * definition — an empty room has no channel — and each live room is then
 * asked for its own occupancy directly, in parallel.
 *
 * A room missing from the answer is a room with nobody in it. The client
 * reads an absent key as zero rather than as unknown. */

import * as Ably from "ably";
import { NextResponse } from "next/server";

import { NS, roomFromWire } from "@/lib/ably";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The REST protocol version ably-js 2.x speaks. The argument is required
 *  and the SDK exports no constant for it. */
const REST_V = 3;

/** A ceiling on the second step. Past this many occupied rooms at once the
 *  product has bigger questions than one poll's fan-out, and the rail will
 *  want a different shape anyway. */
const MOST = 40;

type Detail = { status?: { occupancy?: { metrics?: { presenceMembers?: number } } } };

/* One answer serves every reader for a few seconds. Without this, a room
   with forty people in it makes forty identical fan-outs a tick. */
let cached: { at: number; counts: Record<string, number> } | null = null;
const TTL_MS = 12_000;

/** Step one: which rooms are alive. Items come back as bare channel names
 *  on the plans that do not serve inline metrics, and as objects on the
 *  ones that do — both shapes are read. */
async function alive(rest: Ably.Rest): Promise<string[]> {
  const names = new Set<string>();
  let page: Ably.PaginatedResult<unknown> = await rest.request<unknown>(
    "get",
    "/channels",
    REST_V,
    { prefix: NS, limit: 200 }
  );
  for (let guard = 0; guard < 4; guard++) {
    for (const item of page.items) {
      const name =
        typeof item === "string"
          ? item
          : ((item as { channelId?: string }).channelId ?? "");
      /* Chat's channel is the population. Spaces hangs `::$space` and
         `::$cursors` off the same room name; counting those would double
         everyone standing in a small room. */
      if (name.endsWith("::$chat")) names.add(name);
    }
    if (!page.hasNext()) break;
    const next = await page.next();
    if (!next) break;
    page = next;
  }
  return [...names].slice(0, MOST);
}

/** Step two: how many are in each of them. */
async function count(key: string): Promise<Record<string, number>> {
  const rest = new Ably.Rest(key);
  const names = await alive(rest);

  const counts: Record<string, number> = {};
  await Promise.all(
    names.map(async (name) => {
      const id = roomFromWire(name);
      if (!id) return;
      try {
        const res = await rest.request<Detail>(
          "get",
          `/channels/${encodeURIComponent(name)}`,
          REST_V
        );
        const n = res.items[0]?.status?.occupancy?.metrics?.presenceMembers ?? 0;
        if (n > 0) counts[id] = n;
      } catch {
        /* One room that will not answer is one room, not the whole map. */
      }
    })
  );
  return counts;
}

export async function GET(): Promise<NextResponse> {
  const key = process.env.ABLY_API_KEY;
  if (!key) return NextResponse.json({});

  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json(cached.counts, { headers: { "cache-control": "no-store" } });
  }

  try {
    const counts = await count(key);
    cached = { at: Date.now(), counts };
    return NextResponse.json(counts, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    /* A room that cannot count is a room, not an error (lib/live.ts holds
       the same line about the past layer). But a silent `{}` in
       development is how the two-step above got written in the first
       place, so the reason comes back on a dev build and never on a
       deploy. */
    const why = e instanceof Error ? e.message : String(e);
    console.warn("[ably] occupancy roll-up failed:", why);
    const last = cached ? cached.counts : {};
    return NextResponse.json(
      process.env.NODE_ENV === "production" ? last : { ...last, _why: why },
      { headers: { "cache-control": "no-store" } }
    );
  }
}
