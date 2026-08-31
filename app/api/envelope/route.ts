/* THE ENVELOPE, read and opened. docs/WELCOME.md §3.3; lib/envelope.ts has
 * the argument.
 *
 * GET answers this account's mail, newest first. POST marks it seen. There is
 * no DELETE: a notice falls out of the bottom when the mailbox is full
 * (ENVELOPE_LIMIT) and never because somebody had to tidy it. An inbox you are
 * expected to clear is a chore, and §13 does not hand out chores.
 *
 * SIGNED OUT IS AN EMPTY ENVELOPE, NOT A 401. COMMUNITY.md: a stranger keeps
 * the whole tool, and the mark simply never lights for somebody with no
 * account for anything to be addressed to. Nothing here is a feature gate.
 *
 * NO COUNT IS RETURNED. `unread` is a boolean on purpose — see lib/envelope.ts
 * on why a bold number on an envelope is the oldest engagement device there
 * is. The list is what says how much; the mark only says whether. */

import { auth, hasAuth } from "@/lib/auth";
import { hasDb, query } from "@/lib/db";
import { ENVELOPE_LIMIT, isNoticeKind, type Notice } from "@/lib/envelope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: string;
  room: string | null;
  subject: string | null;
  actor: string | null;
  actor_cls: string | null;
  ref: string | null;
  read_at: Date | string | null;
  created_at: Date | string;
};

async function uid(): Promise<number | null> {
  if (!hasAuth()) return null;
  const session = (await auth()) as { uid?: number | null } | null;
  return typeof session?.uid === "number" ? session.uid : null;
}

const EMPTY = { notices: [] as Notice[], unread: false };

export async function GET() {
  const me = await uid();
  if (me === null || !hasDb()) return Response.json(EMPTY);

  try {
    const rows = await query<Row>(
      `select id, kind, room, subject, actor, actor_cls, ref, read_at, created_at
         from notices
        where user_id = $1
        order by created_at desc
        limit $2`,
      [me, ENVELOPE_LIMIT],
    );
    if (!rows) return Response.json(EMPTY);

    const at = (v: Date | string) => new Date(v).toISOString();
    const notices: Notice[] = rows
      .filter((r) => isNoticeKind(r.kind))
      .map((r) => ({
        id: Number(r.id),
        kind: r.kind as Notice["kind"],
        room: r.room,
        subject: r.subject,
        actor: r.actor,
        actorCls: r.actor_cls,
        ref: r.ref === null ? null : Number(r.ref),
        readAt: r.read_at ? at(r.read_at) : null,
        at: at(r.created_at),
      }));

    return Response.json({ notices, unread: notices.some((n) => n.readAt === null) });
  } catch (e) {
    console.error("envelope: read failed", e);
    return Response.json(EMPTY);
  }
}

/* Opening the envelope. Everything in it, in one write, because "seen" is
   what happened — the reader looked at the list, not at one line of it. */
export async function POST() {
  const me = await uid();
  if (me === null || !hasDb()) return Response.json({ ok: true });

  try {
    await query(`update notices set read_at = now() where user_id = $1 and read_at is null`, [me]);
  } catch (e) {
    console.error("envelope: open failed", e);
  }
  return Response.json({ ok: true });
}
