"use client";

/* WHO IS IN THE ROOM.
 *
 * The column is here on day one because the room has to look right with
 * nobody in it (docs/TARI.md §4.2) — and because presence is the reason the
 * shell persists at all. What it cannot do yet is say a number: the live
 * layer is Liveblocks (§8), which is not installed, has no key, and has a
 * price to check first. So the column states that plainly rather than
 * drawing a zero, which would be a lie about a room that might be full.
 *
 * When Liveblocks lands, this file reads presence for `useRoomId()` and
 * nothing above it changes: the socket is already in Shell.tsx. */

import { getRoom } from "@/lib/rooms";

import { useRoomId } from "./room-context";
import styles from "./shell.module.css";

export default function People() {
  const id = useRoomId();
  const room = id ? getRoom(id) : undefined;

  return (
    <aside className={styles.people} aria-label="In the room">
      <h2 className={styles.columnName}>In the room</h2>
      {room ? (
        <p className={styles.columnBody}>
          Presence for {room.name} arrives with the live layer. Nothing is
          connected on this build.
        </p>
      ) : (
        <p className={styles.columnBody}>Pick a room to see who is standing in it.</p>
      )}
    </aside>
  );
}
