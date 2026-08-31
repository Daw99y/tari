/* One room. The only segment that swaps when the rail is clicked.
 *
 * No loading.tsx sits beside this file and none ever should — docs/SHELL.md,
 * "nothing spins". The rail prefetches on hover, so the payload is in the
 * router cache before the click lands.
 *
 * The URL is the state (SHELL.md): `?class=rogue&at=24` is who is reading,
 * and a shared link shows what the sharer saw. Without it, the character the
 * creator saved (docs/CHARACTER.md) is who is reading. */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { auth, hasAuth } from "@/lib/auth";
import { readWho, WHO_COOKIE } from "@/lib/character";
import { guideFor } from "@/lib/guide";
import { pastIn } from "@/lib/live";
import { clampLevel, defaultLevel, isClassId, lootFor, panelFor } from "@/lib/loot";
import { plateFor } from "@/lib/maps";
import { pinsIn } from "@/lib/pins-db";
import { huntFor } from "@/lib/spots";
import { getRoom, ROOMS } from "@/lib/rooms";

import Room from "./Room";

type Props = {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ class?: string; at?: string; item?: string; say?: string; map?: string }>;
};

/** 75 rooms, all known at build time and none of them changing between
 *  deploys, so every one is listed for prerendering. The page still builds
 *  as dynamic while the shell above it reads a session — the list becomes
 *  free the day that read moves to the client or gets cached. */
export function generateStaticParams() {
  return ROOMS.map((room) => ({ room: room.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const room = getRoom((await params).room);
  return { title: room ? `${room.name} · Tari` : "Tari" };
}

export default async function RoomPage({ params, searchParams }: Props) {
  const room = getRoom((await params).room);
  if (!room) notFound();

  const sp = await searchParams;
  const who = readWho((await cookies()).get(WHO_COOKIE)?.value);
  const cls = isClassId(sp.class) ? sp.class : isClassId(who?.cls) ? who.cls : null;
  const file = lootFor(room.id);
  const level = clampLevel(sp.at ?? (who ? String(who.level) : undefined), file ? defaultLevel(file) : 60);

  // Both read here, on the server, so Room stays plain HTML.
  const past = await pastIn(room.id);
  const drops = file ? panelFor(file, cls, level) : [];

  /* The whole guide file: the telling needs the cards and the geometry
     under them — the road, the patrol, the rares' facts. Spoilers travel
     too; the veil is lifted in place, per card, by the reader. */
  const guide = guideFor(room.id);

  // Read here so Room stays plain HTML: the marks are a file, not a render.
  const plate = await plateFor(room.id);

  // Where the drawn rows' sources stand — the hunt layer and the crop.
  const hunt = await huntFor(room.id, drops, plate);

  /* What people left here. The uid only stamps `mine` — a stranger reads the
     record exactly as a member does (docs/PINS.md).

     Read for every room, not only the plated ones. It used to be gated on the
     plate because a pin needed a spot to stand on; a pin left in the room's
     card stack has no spot, and the thirty-three rooms with no map are the
     ones that read most of what people leave. */
  const session = hasAuth() ? ((await auth()) as { uid?: number | null } | null) : null;
  const pins = await pinsIn(room.id, typeof session?.uid === "number" ? session.uid : null);

  /* `?item=` — the sheet's rows are doors to a card, and the card lives in
     the room that holds the thing (docs/DRESSING.md). An id this room does
     not offer opens nothing; the room is still the right place to have
     landed. */
  const open = /^\d+$/.test(sp.item ?? "") ? Number(sp.item) : undefined;

  /* `?say=1` — the kit's last card ends in front of the composer rather than
     in front of a blank deck (docs/WELCOME.md §2.3). */
  const say = sp.say === "1";

  /* `?map=1` — the door was about a place. The campfire's quest rows send the
     reader to the zone a quest starts in, and what they came for is the map,
     so it is already unfolded when they land (components/Dock.tsx). A room
     with no plate simply has none to unfold. */
  const map = sp.map === "1";

  return (
    <Room room={room} past={past} drops={drops} cls={cls} level={level} guide={guide} plate={plate} hunt={hunt} pins={pins} open={open} say={say} map={map} />
  );
}
