"use client";

/* Which room the reader is standing in.
 *
 * The URL is the source of truth (docs/SHELL.md, "the URL is the state").
 * This is a cheap mirror of it so the two columns beside the room can read
 * the id without every one of them calling a router hook.
 *
 * Note for anyone holding SHELL.md open: it says the rail highlights via
 * `useSelectedLayoutSegment('room')`. That argument is a parallel-route key,
 * not a dynamic segment name, so from the shell layout it returns "r". The
 * segments list is what carries the id — `["r", "duskwood"]` — and Shell.tsx
 * reads it there, once, for everyone. */

import { createContext, useContext } from "react";

const RoomContext = createContext<string | null>(null);

export function RoomProvider({
  id,
  children,
}: {
  id: string | null;
  children: React.ReactNode;
}) {
  return <RoomContext value={id}>{children}</RoomContext>;
}

/** The current room id, or null on a page of the shell that is not a room. */
export function useRoomId(): string | null {
  return useContext(RoomContext);
}
