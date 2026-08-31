/* /you — the character sheet. docs/CHARACTER.md. The path (TARI.md §5)
 * lands on this page later; for now it is the paperdoll.
 *
 * It reads the session here, on the server, for one reason: the card's back
 * (docs/WELCOME.md §3) has to know whether there is an account to keep a
 * preference on. Everything else on the page answers a stranger exactly as it
 * answers a member, which is lib/auth.ts's doctrine and is not bent by this. */

import type { Metadata } from "next";

import { auth, hasAuth } from "@/lib/auth";

import Sheet from "./Sheet";

export const metadata: Metadata = {
  title: "You · Tari",
};

export default async function YouPage() {
  const session = hasAuth() ? await auth() : null;
  const handle = (session as { handle?: string | null } | null)?.handle ?? null;

  return <Sheet handle={handle} canSignIn={hasAuth()} />;
}
