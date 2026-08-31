"use client";

/* WHO IS IN THE ROOM, and what is next door.
 *
 * The column was here on day one with nothing behind it, because the room
 * has to look right with nobody in it (docs/TARI.md §4.2). Now it counts
 * for real: Ably presence for the room you are standing in, and one REST
 * roll-up for the rooms you are not (§4.1 — presence rolls up, so a quiet
 * dungeon points next door).
 *
 * The two are different questions and get different answers. The room you
 * are in has an open presence set, so it can name everybody. The rooms you
 * are not in cost one request between them and can only say how many —
 * which is all a door needs to say.
 *
 * Chat is deliberately not here. It went to the middle of the canvas with
 * the cursors, over the art, because §8 is explicit that the live layer
 * runs across the whole room rather than inside a widget beside it. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePresenceListener } from "@ably/chat/react";

import { readWho, type Who } from "@/lib/ably";
import { nextDoor, outside } from "@/lib/adjacency";
import { CLASS_COLOR } from "@/lib/class-color";
import { getRoom, roomThumb } from "@/lib/rooms";

import { useLive } from "./Live";
import Rested from "./Rested";
import { useRoomId } from "./room-context";
import styles from "./shell.module.css";

/** How many names the column draws before it stops naming and starts
 *  counting. A city is a number; a dungeon is a guest list. */
const NAMED = 30;

export default function People() {
  const router = useRouter();
  const id = useRoomId();
  const { up } = useLive();
  const room = id ? getRoom(id) : undefined;
  const doors = id ? nextDoor(id) : [];
  const out = id ? outside(id) : undefined;
  const heads = useHeadcount(up);

  return (
    <aside className={styles.people} aria-label="In the room">
      <div className={styles.here}>
        <h2 className={styles.columnName}>In the room</h2>

        {!room ? (
          <p className={styles.columnBody}>Pick a room to see who is standing in it.</p>
        ) : up && id ? (
          <Here />
        ) : (
          <p className={styles.columnBody}>
            Presence for {room.name} arrives with the live layer. Nothing is connected on this
            build.
          </p>
        )}
      </div>

      {/* WHAT HAPPENED WHILE YOU WERE GONE, over the doors. docs/WELCOME.md
          §4. The column asks who is here at the top and where you can go at
          the bottom; this is the third question, about a time rather than a
          place, and it sits between them. It renders nothing far more often
          than it renders anything — a room where nothing happened draws no
          heading (§5.2), so the air the doors were pushed into stays air. */}
      <Rested />

      {/* THE DOORS SIT AT THE FOOT OF THE COLUMN.
          They used to follow the heads directly, which left the bottom two
          thirds of a quiet room blank — and a void under the last thing on a
          list reads as something that failed to load. Pushed down, the same
          emptiness becomes the room's own air, and the exits are where exits
          are: at the bottom of the wall. */}
      {doors.length > 0 ? (
        <div className={styles.doors}>
          <h2 className={styles.columnName}>
            {out ? `Outside, in ${out.name}` : "Next door"}
          </h2>
          <ul className={styles.rooms}>
            {doors.map((door) => {
              const n = heads[door.id] ?? 0;
              return (
                <li key={door.id}>
                  <Link
                    href={`/r/${door.id}`}
                    prefetch
                    onPointerEnter={() => router.prefetch(`/r/${door.id}`)}
                    className={styles.room}
                  >
                    <img
                      className={styles.roomArt}
                      src={roomThumb(door.id)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <span className={styles.roomName}>
                      <span>{door.name}</span>
                      {n > 0 ? (
                        <span className={styles.roomBand} title={`${n} standing here`}>
                          {n}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

/* The named half. A separate component because the presence hook only
 * exists inside a room's scope, and hooks cannot be asked conditionally. */
function Here() {
  const { presenceData } = usePresenceListener();
  const { meId } = useLive();

  /* ONE PERSON, ONE NAME. Ably's presence set is per *connection*, so a
     reader with the room open in two tabs is in it twice — and a room that
     says "2 here" to somebody standing alone is worse than saying nothing.
     Keyed by clientId, which is the account or the browser, not the
     socket. */
  const by = new Map<string, Who>();
  for (const m of presenceData) {
    const who = readWho(m.data);
    if (who && !by.has(m.clientId)) by.set(m.clientId, who);
  }
  const people = [...by.entries()]
    .map(([id, who]) => ({ id, who }))
    /* Highest level first. It is the game's own way of reading a group,
       and it puts the person worth asking at the top. */
    .sort((a, b) => b.who.level - a.who.level || a.who.name.localeCompare(b.who.name));

  if (people.length === 0) {
    return <p className={styles.columnBody}>Nobody here yet. You are the first one in.</p>;
  }

  return (
    <>
      <p className={styles.hereCount}>
        {people.length === 1 ? "Just you" : `${people.length} here`}
      </p>
      <ul className={styles.heads}>
        {people.slice(0, NAMED).map((p) => (
          <li key={p.id} className={styles.head}>
            <span className={styles.headName} style={{ color: CLASS_COLOR[p.who.cls] }}>
              {p.who.name}
            </span>
            <span className={styles.headBand}>
              {p.id === meId ? "you" : `${p.who.level} ${p.who.cls}`}
            </span>
          </li>
        ))}
      </ul>
      {people.length > NAMED ? (
        <p className={styles.hereMore}>and {people.length - NAMED} more</p>
      ) : null}
    </>
  );
}

/* HOW MANY, NEXT DOOR. One request for every room that has anyone in it,
 * on a slow tick — a door does not need to be live to the second, and this
 * is the one call in the product that is a poll rather than a push.
 *
 * The rail's 75 rooms read the same answer the day they want it; the shape
 * is already "every room at once". */
function useHeadcount(up: boolean): Record<string, number> {
  const [heads, setHeads] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!up) return;
    let live = true;
    async function tick() {
      try {
        const res = await fetch("/api/ably/occupancy", { cache: "no-store" });
        if (!res.ok) return;
        const counts = (await res.json()) as Record<string, number>;
        if (live) setHeads(counts);
      } catch {
        /* A door that cannot count is still a door. */
      }
    }
    void tick();
    const every = setInterval(tick, 25_000);
    return () => {
      live = false;
      clearInterval(every);
    };
  }, [up]);

  return heads;
}
