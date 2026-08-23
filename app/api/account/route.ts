/**
 * Forgetting somebody.
 *
 * One statement, because there is one row. The account holds an internal id
 * and the provider pair that minted it; the marks are on the reader's own
 * machine and the live log holds no user column at all — see lib/live.ts,
 * which explains why that was worth doing.
 *
 * When sync ships this route grows: it will have records to take with it, and
 * an `on delete cascade` is the way to be sure it does. Nothing else about it
 * changes, which is the point of putting the delete in before there is
 * anything to delete.
 */

import { auth } from "../../../lib/auth";
import { hasDb, query } from "../../../lib/db";

export async function DELETE() {
  if (!hasDb()) return Response.json({ ok: true });

  const session = await auth();
  const uid = (session as { uid?: number } | null)?.uid;
  /* Not an error: a request with no session has nothing to delete, and saying
     so loudly would be a way of confirming what a session looks like. */
  if (!uid) return Response.json({ ok: true });

  try {
    await query(`delete from users where id = $1`, [uid]);
  } catch (e) {
    console.error("account: delete failed", e);
    return Response.json({ error: "could not delete" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
