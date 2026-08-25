"use client";

/* THE RAIL. Discord's rail is a list of servers you joined; Tari's rail is
 * Azeroth (docs/TARI.md §11.2).
 *
 * So every row carries the room's own photograph rather than an icon of it.
 * The art is held down dark and lifts under the pointer — the list reads as
 * a column of places at dusk, and each one has its own colour before you
 * have read a single name.
 *
 * Nothing spins (§11.3): a row prefetches its room on hover, so the RSC
 * payload is usually in the router cache before the click lands. */

import Link from "next/link";
import { useRouter } from "next/navigation";

import { KIND_LABEL, roomThumb, roomsByKind } from "@/lib/rooms";

import { useRoomId } from "./room-context";
import styles from "./shell.module.css";

const GROUPS = roomsByKind();

export default function Rail() {
  const here = useRoomId();
  const router = useRouter();

  return (
    <nav className={styles.rail} aria-label="Azeroth">
      {GROUPS.map((group) => (
        <section key={group.kind} className={styles.group}>
          <h2 className={styles.groupName}>{KIND_LABEL[group.kind]}</h2>
          <ul className={styles.rooms}>
            {group.rooms.map((room) => {
              const current = room.id === here;
              return (
                <li key={room.id}>
                  <Link
                    href={`/r/${room.id}`}
                    prefetch
                    onPointerEnter={() => router.prefetch(`/r/${room.id}`)}
                    className={styles.room}
                    data-current={current || undefined}
                    aria-current={current ? "page" : undefined}
                  >
                    {/* The small copy, not the master: 75 rows of full-bleed
                        art is 14 MB of pictures nobody has asked for yet.
                        See scripts/rail-thumbs.mjs. */}
                    <img
                      className={styles.roomArt}
                      src={roomThumb(room.id)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <span className={styles.roomName}>{room.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
