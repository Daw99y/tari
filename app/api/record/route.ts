/**
 * THE RECORD, BOTH WAYS, IN ONE REQUEST.
 *
 * The device says what it changed and what it last heard; this writes the
 * first half and answers with everything the account has changed since the
 * second. One round trip on purpose — a merge conducted over two requests can
 * interleave with itself, and this way the write and the read share a snapshot.
 *
 * SIGNED OUT IS 401 AND THE CLIENT NEVER ASKS. There is nothing here for a
 * stranger, and nothing a stranger loses: every count, every plan and every
 * zone answers them exactly as it answers a member. See COMMUNITY.md.
 *
 * THE CLOCK IS THIS PROCESS'S AND NEVER THE BROWSER'S. `updated_at` is stamped
 * by `now()`, so the order that settles a conflict is the order changes
 * arrived. Two of the reader's machines will disagree about the time by
 * minutes; neither of them gets a vote.
 */

import { auth } from "../../../lib/auth";
import { hasDb, query } from "../../../lib/db";
import { MAX_MARKS, readPush, type Char, type Mark } from "../../../lib/sync";

const WINDOW_MS = 60_000;
const PER_WINDOW = 60;
const hits = new Map<string, number[]>();

function limited(who: string): boolean {
  const now = Date.now();
  const seen = (hits.get(who) ?? []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  hits.set(who, seen);
  if (hits.size > 500)
    for (const [key, times] of hits)
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  return seen.length > PER_WINDOW;
}

/**
 * How far behind the server's own clock the cursor is handed back.
 *
 * Without it this loses writes, quietly and forever. A pull reads a snapshot;
 * another device's transaction can commit at a timestamp *earlier* than that
 * snapshot but only become visible after it, and a cursor set to the exact
 * read time would step straight over it. Five seconds of overlap re-sends a
 * handful of rows the device already has, which costs nothing, because
 * applying a mark twice lands on the same mark.
 */
const LAG = "5 seconds";

export async function POST(req: Request) {
  if (!hasDb()) return Response.json({ error: "no record" }, { status: 404 });

  const session = (await auth()) as { uid?: number | null } | null;
  const uid = session?.uid;
  if (typeof uid !== "number")
    return Response.json({ error: "sign in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const push = readPush(body);
  if (!push) return Response.json({ error: "bad request" }, { status: 400 });

  /* Keyed on the account rather than the address: this is the one route in the
     app where the caller is known, and a household behind one IP should not
     rate-limit each other. */
  if (limited(String(uid)))
    return Response.json({ error: "slow down" }, { status: 429 });

  try {
    if (push.marks.length) {
      /* One statement for the whole batch. Ticking eight items is eight rows
         and one round trip to the database, the same shape app/api/say uses.
         `do update` rather than `do nothing`: a mark arriving again is the
         point — that is what an un-tick is. */
      await query(
        `insert into marks (user_id, char_key, kind, subject, val, on_mark, updated_at)
         select $1, c, k, s, v, o, now()
           from unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::boolean[])
             as t(c, k, s, v, o)
         on conflict (user_id, char_key, kind, subject) do update
           set on_mark = excluded.on_mark,
               val = excluded.val,
               updated_at = excluded.updated_at`,
        [
          uid,
          push.marks.map((m) => m.char),
          push.marks.map((m) => m.kind),
          push.marks.map((m) => m.subject),
          push.marks.map((m) => m.val ?? null),
          push.marks.map((m) => m.on),
        ]
      );
    }

    if (push.chars.length) {
      await query(
        `insert into characters (user_id, char_key, profile, gone, updated_at)
         select $1, c, p::jsonb, g, now()
           from unnest($2::text[], $3::text[], $4::boolean[]) as t(c, p, g)
         on conflict (user_id, char_key) do update
           set profile = excluded.profile,
               gone = excluded.gone,
               updated_at = excluded.updated_at`,
        [
          uid,
          push.chars.map((c) => c.char),
          push.chars.map((c) => JSON.stringify(c.profile)),
          push.chars.map((c) => c.gone === true),
        ]
      );
    }

    /* `since` null means a fresh device asking for everything. The epoch rather
       than a branch in the SQL, so there is one query to reason about. */
    const since = push.since ?? "1970-01-01T00:00:00Z";

    const marks = await query<{
      char_key: string;
      kind: string;
      subject: string;
      val: string | null;
      on_mark: boolean;
      at: string;
    }>(
      `select char_key, kind, subject, val, on_mark, updated_at::text as at
         from marks
        where user_id = $1 and updated_at > $2::timestamptz
        order by updated_at
        limit $3`,
      [uid, since, MAX_MARKS]
    );

    const chars = await query<{ char_key: string; profile: unknown; gone: boolean }>(
      `select char_key, profile, gone
         from characters
        where user_id = $1 and updated_at > $2::timestamptz
        order by updated_at`,
      [uid, since]
    );

    const now = await query<{ at: string }>(
      `select (now() - interval '${LAG}')::text as at`
    );

    /* THE CURSOR AFTER A TRUNCATED PAGE IS THE LAST ROW'S OWN TIME, NOT NOW.
       Handing back the clock after cutting the page off at the cap would step
       the device straight over everything the cap excluded, and it would never
       come back for it. `more` is what tells the client to ask again at once
       rather than waiting for the next tick. */
    const more = (marks?.length ?? 0) >= MAX_MARKS;
    const at = more
      ? (marks?.[marks.length - 1]?.at ?? now?.[0]?.at)
      : now?.[0]?.at;

    return Response.json(
      {
        at: at ?? new Date().toISOString(),
        marks: (marks ?? []).map(
          (r): Mark => ({
            char: r.char_key,
            kind: r.kind as Mark["kind"],
            subject: r.subject,
            val: r.val,
            on: r.on_mark,
          })
        ),
        chars: (chars ?? []).map(
          (r): Char => ({
            char: r.char_key,
            profile: (r.profile ?? {}) as Record<string, unknown>,
            gone: r.gone,
          })
        ),
        more,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    /* A sync that did not land is a sync that happens again in two seconds.
       Nothing the reader did has been lost: localStorage took it first. */
    console.error("record: failed", e);
    return Response.json({ error: "later" }, { status: 503 });
  }
}
