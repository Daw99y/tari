"use client";

/* WHO IS HERE NOW — and "now" is about the room, never about the reader.
 *
 * This is the one place on the front door the word is allowed. A presence
 * count comes off Ably, which is people with the room open in a browser this
 * second (app/api/ably/occupancy). It is a true live fact and it says nothing
 * about where anybody is standing in the game, which is the fact rule 9
 * forbids us to imply.
 *
 * IT DRAWS NOTHING FOR AN EMPTY ROOM. The people column already refuses to
 * draw a zero and this keeps that line: "0 here" is a worse thing to read than
 * a row that is not there, and on a deploy with no ABLY_API_KEY the route
 * answers {} and every room is quietly absent.
 *
 * ONE POLL, SHARED. The route caches its fan-out for twelve seconds, so the
 * interval here is longer than that on purpose — a faster tick would buy the
 * same number twice. */

import { useEffect, useState } from "react";

import styles from "./home.module.css";

const EVERY_MS = 20_000;

export default function Population({ room }: { room: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let live = true;

    async function look() {
      try {
        const res = await fetch("/api/ably/occupancy", { cache: "no-store" });
        const all = (await res.json()) as Record<string, number>;
        if (live) setCount(all[room] ?? 0);
      } catch {
        /* A count that will not answer is a room, not an error. */
      }
    }

    setCount(0);
    void look();
    const timer = setInterval(look, EVERY_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [room]);

  if (count < 1) return null;

  return (
    <p className={styles.population}>
      <span className={styles.populationCount}>{count}</span>
      {count === 1 ? " person has this room open now" : " people have this room open now"}
    </p>
  );
}
