/* RESTED, read. docs/WELCOME.md §4; lib/rested.ts holds the argument.
 *
 * lib/live.ts said it in its own header and has said it since it was written:
 * "Without accounts there is no 'you' yet ... the account cursor lands on the
 * same query the day it exists." This is that day and this is that query. The
 * past layer says what happened here lately; this says what happened here
 * while *you* were somewhere else, which is the same table read from a
 * different end.
 *
 * THE CURSOR ARRIVES FROM THE BROWSER AND THAT IS DELIBERATE. It is a `been`
 * mark, which lives in localStorage first and syncs only for a reader who
 * signed in (COMMUNITY.md: a stranger keeps the whole tool). A signed-out
 * reader gets Rested on the machine they read on, which is the correct
 * degradation — the alternative is a growth mechanic that requires an account,
 * and that is the shape §0 refuses.
 *
 * A CURSOR IS A CLAIM AND IT IS CLAMPED. It is the reader's own disk and the
 * worst a forged one buys is a longer sentence about a public room, but it is
 * still an untrusted number reaching a date function, so it is parsed, floored
 * at a fortnight of history and refused if it is in the future.
 *
 * GET only, and never a write. Stamping the cursor is the browser's job
 * (Rested.tsx) because the browser is the only end that knows the card was
 * actually looked at. */

import { auth, hasAuth } from "@/lib/auth";
import { hasDb, query } from "@/lib/db";
import { MAX_LEVEL } from "@/lib/character";
import { RESTED_BAND, subjectOf, type Rested } from "@/lib/rested";
import { getRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How far back a cursor may reach. Beyond this the sentence stops being a
 *  homecoming and starts being an archive, and the queries stop being cheap. */
const OLDEST_MS = 90 * 24 * 60 * 60 * 1000;

function cursor(raw: string | null): Date | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  const now = Date.now();
  if (t > now) return null;
  return new Date(Math.max(t, now - OLDEST_MS));
}

async function uid(): Promise<number | null> {
  if (!hasAuth()) return null;
  const session = (await auth()) as { uid?: number | null } | null;
  return typeof session?.uid === "number" ? session.uid : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const room = getRoom(url.searchParams.get("room") ?? "");
  const since = cursor(url.searchParams.get("since"));
  if (!room || !since || !hasDb()) return Response.json({ rested: null });

  const raw = Number(url.searchParams.get("at"));
  const level = Number.isFinite(raw) ? Math.min(Math.max(Math.round(raw), 1), MAX_LEVEL) : null;

  const me = await uid();
  const iso = since.toISOString();

  try {
    const [came, pins, replies] = await Promise.all([
      /* Who came through, at your level. The band is TARI.md §4.3's index and
         not a filter the reader chose — a room is about the people it is for.
         Distinct on `who` so one person doing six things is one person; the
         rows with no name fall back to being counted as rows, because an
         anonymous event is still somebody. */
      query<{ n: number }>(
        `select (count(distinct e.who) + count(*) filter (where e.who is null))::int as n
           from events e
          where e.place = $1
            and e.created_at > $2
            and ($3::int is null or e.level between $3::int - $4::int and $3::int + $4::int)`,
        [room.id, iso, level, RESTED_BAND],
      ),
      /* What was left here. Threads only — a reply is news to one reader and
         it is counted below, under their name — and never your own: a pin you
         left before you walked out is not news waiting for you when you come
         back, it is a thing you already know. */
      query<{ n: number }>(
        `select count(*)::int as n
           from pins
          where room = $1 and parent is null and removed_at is null
            and created_at > $2
            and ($3::bigint is null or user_id <> $3::bigint)`,
        [room.id, iso, me],
      ),
      /* What was said back to you. Nothing for a signed-out reader, which is
         honest: replies live on the account, not on the machine. */
      me === null
        ? Promise.resolve([] as { n: number; body: string }[])
        : query<{ n: number; body: string }>(
            `select count(*) over ()::int as n, p.body
               from pins r
               join pins p on p.id = r.parent
              where r.room = $1 and r.removed_at is null
                and r.created_at > $2
                and p.user_id = $3 and r.user_id <> $3
              order by r.created_at desc
              limit 1`,
            [room.id, iso, me],
          ),
    ]);

    const top = replies?.[0];
    const rested: Rested = {
      days: Math.floor((Date.now() - since.getTime()) / 86_400_000),
      came: came?.[0]?.n ?? 0,
      pins: pins?.[0]?.n ?? 0,
      replies: top?.n ?? 0,
      answered: top?.body ? subjectOf(top.body) : null,
    };

    return Response.json({ rested });
  } catch (e) {
    /* A room with no database behind it is a room, not an error — lib/live.ts,
       and the same rule one route along. */
    console.error("rested: read failed", e);
    return Response.json({ rested: null });
  }
}
