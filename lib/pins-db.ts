/* The table read. Server only — imports the pool. */

import { query } from "./db";
import { PIN_LIMIT, type Pin, type PinReply } from "./pins";
import type { ClassId } from "./types";

type Row = {
  id: string;
  /** Null for a pin left in the room's card stack rather than on the map. */
  x: number | null;
  y: number | null;
  body: string;
  parent: string | null;
  user_id: string;
  who: string;
  cls: string;
  level: number;
  created_at: Date | string;
};

/** Every thread said in this room, replies folded under their pin. `uid`
 *  stamps `mine`, which is the only thing a reader may take back. */
export async function pinsIn(room: string, uid: number | null): Promise<Pin[]> {
  const rows = await query<Row>(
    `select id, x, y, body, parent, user_id, who, cls, level, created_at
       from pins
      where room = $1 and removed_at is null
      order by created_at asc
      limit $2`,
    [room, PIN_LIMIT * 5]
  );
  if (!rows) return [];

  const mine = (r: Row) => uid !== null && Number(r.user_id) === uid;
  const at = (r: Row) => new Date(r.created_at).toISOString();

  const threads = new Map<number, Pin>();
  for (const r of rows) {
    if (r.parent !== null) continue;
    threads.set(Number(r.id), {
      id: Number(r.id),
      x: r.x,
      y: r.y,
      body: r.body,
      who: r.who,
      cls: r.cls as ClassId,
      level: r.level,
      at: at(r),
      mine: mine(r),
      replies: [],
    });
  }
  for (const r of rows) {
    if (r.parent === null) continue;
    const head = threads.get(Number(r.parent));
    if (!head) continue;
    const reply: PinReply = {
      id: Number(r.id),
      body: r.body,
      who: r.who,
      cls: r.cls as ClassId,
      level: r.level,
      at: at(r),
      mine: mine(r),
    };
    head.replies.push(reply);
  }

  /* Newest thread first, capped after assembly so a reply never orphans. */
  return [...threads.values()].reverse().slice(0, PIN_LIMIT);
}
