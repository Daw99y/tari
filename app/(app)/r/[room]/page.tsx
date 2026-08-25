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

import { readWho, WHO_COOKIE } from "@/lib/character";
import { guideFor } from "@/lib/guide";
import { pastIn } from "@/lib/live";
import { clampLevel, defaultLevel, isClassId, lootFor, panelFor } from "@/lib/loot";
import { plateFor } from "@/lib/maps";
import { getRoom, ROOMS } from "@/lib/rooms";

import Room from "./Room";

type Props = {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ class?: string; at?: string }>;
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

  // Nothing held back: every card, in the file's order.
  const guide = guideFor(room.id)?.cards ?? [];

  // Read here so Room stays plain HTML: the marks are a file, not a render.
  const plate = await plateFor(room.id);

  return (
    <Room room={room} past={past} drops={drops} cls={cls} level={level} guide={guide} plate={plate} />
  );
}
