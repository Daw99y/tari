/* THE FOLLOW. docs/WELCOME.md §7; lib/follow.ts has the argument.
 *
 * YOU FOLLOW A PIN, NOT A USER ID. The body names a pin and the route resolves
 * its author, which is not a convenience — it is the feature's shape. §7 is
 * place-first: you follow somebody *because of something they left in a room
 * you were standing in*, and there is no screen in this product that lists
 * people to be followed. No user id is ever sent by a browser or returned to
 * one, so there is nothing to enumerate.
 *
 * DELETE takes the same pin and undoes it. Unfollowing is a real delete rather
 * than a tombstone, and it is the one place in the product where that is
 * right: marks and pins are a record of what you did, but a follow is a live
 * subscription, and a subscription you cancelled should leave nothing behind
 * that says you once had it.
 *
 * FOLLOWING SOMEBODY POSTS ONE NOTICE TO THEM AND NEVER A TOTAL. They are told
 * that you follow where they stand; they are never told how many people do.
 * §7's refusal is the number, not the fact.
 *
 * There is no GET. "Who do I follow" is answered by the pins in the room you
 * are standing in already carrying the flag (lib/pins-db.ts) — a list of the
 * people you follow is a timeline's first step and §7 refuses the timeline. */

import { auth, hasAuth } from "@/lib/auth";
import { hasDb, query } from "@/lib/db";
import { FOLLOW_LIMIT } from "@/lib/follow";
import { subjectOf } from "@/lib/rested";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function uid(): Promise<number | null> {
  if (!hasAuth()) return null;
  const session = (await auth()) as { uid?: number | null } | null;
  return typeof session?.uid === "number" ? session.uid : null;
}

/** The pin named in the body, and who wrote it. */
async function authorOf(raw: unknown): Promise<{ id: number; user: number; room: string; body: string } | null> {
  const n = Number((raw as { pin?: unknown })?.pin);
  if (!Number.isInteger(n) || n <= 0) return null;
  const rows = await query<{ id: string; user_id: string; room: string; body: string }>(
    `select id, user_id, room, body from pins where id = $1 and removed_at is null`,
    [n],
  );
  const row = rows?.[0];
  return row ? { id: Number(row.id), user: Number(row.user_id), room: row.room, body: row.body } : null;
}

export async function POST(req: Request) {
  const me = await uid();
  if (me === null) return Response.json({ ok: false }, { status: 401 });
  if (!hasDb()) return Response.json({ ok: false }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  try {
    const pin = await authorOf(body);
    if (!pin) return Response.json({ ok: false }, { status: 404 });

    /* Following yourself is a schema check as well as a nonsense, and Tari's
       own seeds have no account behind them to follow. */
    if (pin.user === me) return Response.json({ ok: false, reason: "self" }, { status: 400 });

    const mine = await query<{ n: number }>(
      `select count(*)::int as n from follows where follower = $1`,
      [me],
    );
    if ((mine?.[0]?.n ?? 0) >= FOLLOW_LIMIT) {
      return Response.json({ ok: false, reason: "limit" }, { status: 429 });
    }

    const done = await query<{ follower: string }>(
      `insert into follows (follower, followed) values ($1, $2)
       on conflict do nothing
       returning follower`,
      [me, pin.user],
    );

    /* One notice, and only on a follow that was not already true — otherwise
       unfollowing and refollowing is a way to poke somebody. */
    if (done && done.length > 0) {
      const who = await query<{ who: string; cls: string }>(
        `select who, cls from pins where user_id = $1 and removed_at is null
          order by created_at desc limit 1`,
        [me],
      );
      await query(
        `insert into notices (user_id, kind, room, subject, actor, actor_cls, ref)
         values ($1, 'follow', $2, $3, $4, $5, $6)`,
        [pin.user, pin.room, subjectOf(pin.body), who?.[0]?.who ?? null, who?.[0]?.cls ?? null, pin.id],
      );
    }

    return Response.json({ ok: true, followed: true });
  } catch (e) {
    console.error("follow: write failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const me = await uid();
  if (me === null) return Response.json({ ok: false }, { status: 401 });
  if (!hasDb()) return Response.json({ ok: false }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  try {
    const pin = await authorOf(body);
    if (!pin) return Response.json({ ok: false }, { status: 404 });
    await query(`delete from follows where follower = $1 and followed = $2`, [me, pin.user]);
    return Response.json({ ok: true, followed: false });
  } catch (e) {
    console.error("follow: delete failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
