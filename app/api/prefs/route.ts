/* WHAT YOU ASKED TO BE TOLD. docs/WELCOME.md §3.2 rule 5; lib/nudge.ts has
 * the list and the rules.
 *
 * Per-thing, never a blanket permission — so this route takes a map of known
 * ids to booleans and refuses everything else. `readPrefs` is the filter: an
 * id that is not in WORLD_THINGS cannot be stored, which means the day a thing
 * is removed from that list it stops being deliverable rather than lingering
 * in somebody's row.
 *
 * IT REQUIRES AN ACCOUNT AND ONLY THIS DOES. A preference has to outlive the
 * browser that set it or it is not a preference, and there is nowhere but
 * `users` to hang it. Signed out, the card's back says so and offers the door
 * — it does not hide the list, because the list is also the clearest statement
 * of what Tari will and will not tell you (§3.1). */

import { auth, hasAuth } from "@/lib/auth";
import { hasDb, query } from "@/lib/db";
import { readPrefs, type Prefs } from "@/lib/nudge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function uid(): Promise<number | null> {
  if (!hasAuth()) return null;
  const session = (await auth()) as { uid?: number | null } | null;
  return typeof session?.uid === "number" ? session.uid : null;
}

export async function GET() {
  const me = await uid();
  if (me === null || !hasDb()) return Response.json({ prefs: {} as Prefs, signedIn: me !== null });

  try {
    const rows = await query<{ prefs: unknown }>(`select prefs from users where id = $1`, [me]);
    return Response.json({ prefs: readPrefs(rows?.[0]?.prefs), signedIn: true });
  } catch (e) {
    console.error("prefs: read failed", e);
    return Response.json({ prefs: {} as Prefs, signedIn: true });
  }
}

export async function PUT(req: Request) {
  const me = await uid();
  if (me === null || !hasDb()) return Response.json({ ok: false, signedIn: false }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const prefs = readPrefs((body as { prefs?: unknown })?.prefs);

  try {
    await query(`update users set prefs = $2::jsonb where id = $1`, [me, JSON.stringify(prefs)]);
    return Response.json({ ok: true, prefs });
  } catch (e) {
    console.error("prefs: write failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
