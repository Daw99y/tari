/* CLASSIC+. The room for a game that does not exist yet.
 *
 * `docs/DIRECTION.md` §5. Its first event is one Saturday panel; the room is
 * permanent, so nothing in it is named after that Saturday.
 *
 * IT IS A ROOM LIKE EVERY OTHER ROOM, and this file is the proof: presence,
 * chat, cursors, moments, one deck and one Tari-signed seed all arrive from
 * `<Room>` and the shell above it, unchanged. The only reason it is a page of
 * its own rather than a row in `generateStaticParams` is the URL — a link in a
 * reddit post should read `/classicplus`, not `/r/classicplus` (lib/rooms.ts,
 * roomHref). `/r/classicplus` redirects here rather than serving the same room
 * at two addresses.
 *
 * WHAT IT DOES NOT READ. Four of the room page's reads are about places in
 * Azeroth: the loot file, the map plate, the hunt layer and the guide. None of
 * them has an answer for a game nobody has shipped, and calling them to be
 * handed four empty values would be this page pretending to ask a question.
 * They are passed empty instead, which is the same state the thirty-three
 * unplated rooms already render.
 *
 * No `loading.tsx` beside this file, for the same reason there is none beside
 * the room's (docs/SHELL.md, "nothing spins"). */

import type { Metadata } from "next";

import { auth, hasAuth } from "@/lib/auth";
import { pastIn } from "@/lib/live";
import { pinsIn } from "@/lib/pins-db";
import { CLASSICPLUS } from "@/lib/rooms";

import Room from "../r/[room]/Room";

export const metadata: Metadata = {
  title: "Classic+ · Tari",
  description:
    "The room for a game that does not exist yet. Watch the Classic panel with everyone.",
};

type Props = {
  searchParams: Promise<{ say?: string }>;
};

export default async function ClassicPlusPage({ searchParams }: Props) {
  const sp = await searchParams;

  /* Both read on the server, so the room stays HTML the server streams. */
  const past = await pastIn(CLASSICPLUS.id);

  /* What people left here. The uid only stamps `mine` — a stranger reads the
     record exactly as a member does (docs/PINS.md). On open the deck holds
     Tari's seeds and nothing else, which is the panel schedule. */
  const session = hasAuth() ? ((await auth()) as { uid?: number | null } | null) : null;
  const pins = await pinsIn(CLASSICPLUS.id, typeof session?.uid === "number" ? session.uid : null);

  return (
    <Room
      room={CLASSICPLUS}
      past={past}
      drops={[]}
      cls={null}
      level={60}
      guide={undefined}
      plate={undefined}
      hunt={[]}
      pins={pins}
      say={sp.say === "1"}
    />
  );
}
