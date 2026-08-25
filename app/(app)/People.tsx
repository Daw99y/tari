"use client";

/* WHO IS IN THE ROOM, and what is next door.
 *
 * The column is here on day one because the room has to look right with
 * nobody in it (docs/TARI.md §4.2) — and because presence is the reason the
 * shell persists at all. What it cannot do yet is say a number: the live
 * layer is Liveblocks (§8), which is not installed, has no key, and has a
 * price to check first. So the column states that plainly rather than
 * drawing a zero, which would be a lie about a room that might be full.
 *
 * What it can do is point next door (§4.1): the rooms that border this one,
 * drawn as the rail draws a room, so the reader is one click from wherever
 * the people are. When Liveblocks lands, the count goes beside each name
 * and nothing above it changes. */

import Link from "next/link";
import { useRouter } from "next/navigation";

import { nextDoor, outside } from "@/lib/adjacency";
import { getRoom, roomThumb } from "@/lib/rooms";

import { useRoomId } from "./room-context";
import styles from "./shell.module.css";

export default function People() {
  const router = useRouter();
  const id = useRoomId();
  const room = id ? getRoom(id) : undefined;
  const doors = id ? nextDoor(id) : [];
  const out = id ? outside(id) : undefined;

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

      {doors.length > 0 ? (
        <>
          <h2 className={`${styles.columnName} ${styles.columnNameLater}`}>
            {out ? `Outside, in ${out.name}` : "Next door"}
          </h2>
          <ul className={styles.rooms}>
            {doors.map((door) => (
              <li key={door.id}>
                <Link
                  href={`/r/${door.id}`}
                  prefetch
                  onPointerEnter={() => router.prefetch(`/r/${door.id}`)}
                  className={styles.room}
                >
                  <img className={styles.roomArt} src={roomThumb(door.id)} alt="" loading="lazy" decoding="async" />
                  <span className={styles.roomName}>{door.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
