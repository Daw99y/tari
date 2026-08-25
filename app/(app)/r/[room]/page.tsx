/* One room. The only segment that swaps when the rail is clicked.
 *
 * No loading.tsx sits beside this file and none ever should — docs/SHELL.md,
 * "nothing spins". The rail prefetches on hover, so the payload is in the
 * router cache before the click lands. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getRoom, ROOMS } from "@/lib/rooms";

import Room from "./Room";

type Props = { params: Promise<{ room: string }> };

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

export default async function RoomPage({ params }: Props) {
  const room = getRoom((await params).room);
  if (!room) notFound();
  return <Room room={room} />;
}
