/* THE DOOR TO THE LIVE LAYER. A token, not the key.
 *
 * The browser never sees ABLY_API_KEY. It asks here, and gets back a signed
 * token request scoped to `tari:*` and stamped with a clientId it cannot
 * choose for itself if it is signed in.
 *
 * WHO YOU ARE, AND HOW MUCH OF IT IS TRUE. Signed in through Discord, the
 * clientId is the account's handle and the browser gets no say — that name
 * is verified and everything published under it is attributable. Signed
 * out, the browser brings the key its creator minted (docs/CHARACTER.md);
 * it is sanitised here, prefixed `g:`, and it means "the same visitor as
 * last time", not "this person". The display name rides in presence data
 * either way and is never verified — a claim, exactly like a name in a
 * chat channel in the game. The seam for making it verified is this
 * function and nothing else. */

import * as Ably from "ably";
import { NextResponse } from "next/server";

import { auth, hasAuth } from "@/lib/auth";
import { NS } from "@/lib/ably";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What a token may do, and only inside our own namespace. `message-*-own`
 *  rather than `-any`: you may take back what you said and nothing else. */
const CAPABILITY: Record<string, Ably.capabilityOp[]> = {
  [`${NS}*`]: [
    "publish",
    "subscribe",
    "presence",
    "history",
    "annotation-publish",
    "annotation-subscribe",
    "message-update-own",
    "message-delete-own",
  ],
};

/** A guest key is an opaque handle from a browser we do not trust. Keep the
 *  characters that can only be a key. */
function guest(asked: string): string {
  const clean = asked.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  return clean || `anon-${Math.random().toString(36).slice(2, 12)}`;
}

export async function GET(req: Request): Promise<NextResponse> {
  const key = process.env.ABLY_API_KEY;
  /* No key on this deploy is a room with no live layer, not an error. The
     shell reads the 503 and stays quiet — the same way it did before Ably
     existed. */
  if (!key) return NextResponse.json({ error: "no live layer here" }, { status: 503 });

  const session = hasAuth() ? await auth() : null;
  const handle = (session as { handle?: string | null } | null)?.handle ?? null;
  const asked = new URL(req.url).searchParams.get("id") ?? "";
  const clientId = handle ? `u:${handle}` : `g:${guest(asked)}`;

  const rest = new Ably.Rest(key);
  const token = await rest.auth.createTokenRequest({ clientId, capability: CAPABILITY });

  return NextResponse.json(token, {
    headers: { "cache-control": "no-store" },
  });
}
