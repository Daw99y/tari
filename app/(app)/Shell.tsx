"use client";

/* THE SHELL. It mounts once and never unmounts again.
 *
 * Everything in this file is here because it must survive a room change:
 * the rail, the people column, ⌘K, and — when it lands — the one socket.
 *
 * THE LIVE LAYER lives in <Live>, wrapped around the three columns below.
 * It is Ably, not Liveblocks — §8 said price it first, and the price turned
 * out to be a hard cap of 10 connections per room on every Liveblocks plan
 * worth buying, against a product whose premise is a whole zone standing in
 * one room. Ably bills per message instead of per seat. One connection for
 * the life of the shell; the room's scope is swapped by name inside it.
 *
 * The current room comes from the URL, read once here and handed down. */

import { usePathname, useRouter, useSelectedLayoutSegments } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

import FoxMark from "@/components/FoxMark";
import { loadCharacter } from "@/lib/character";

import Command from "./Command";
import Live from "./Live";
import People from "./People";
import Rail from "./Rail";
import You from "./You";
import { RoomProvider } from "./room-context";
import styles from "./shell.module.css";

export default function Shell({
  handle,
  canSignIn,
  children,
}: {
  handle: string | null;
  /** Whether this deploy has a door at all (lib/auth.ts, hasAuth). No door
   *  means the foot draws the character and nothing else — a sign-in offer
   *  that cannot work is worse than no offer. */
  canSignIn: boolean;
  children: React.ReactNode;
}) {
  const segments = useSelectedLayoutSegments();
  const roomId = segments[0] === "r" && segments[1] ? segments[1] : null;
  const pathname = usePathname();
  const router = useRouter();
  const [asking, setAsking] = useState(false);

  /* The doorstep, once (docs/CHARACTER.md): no character yet means the
     creator, whatever room was asked for. Every visit after goes straight
     through. */
  useEffect(() => {
    if (pathname !== "/you/new" && !loadCharacter()) router.replace("/you/new");
  }, [pathname, router]);

  /* ⌘K anywhere in the shell. Ctrl+K too, because half the readers are on a
     gaming PC. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAsking((was) => !was);
      }
      if (e.key === "Escape") setAsking(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* A navigation closes it, however the navigation happened. */
  useEffect(() => {
    setAsking(false);
  }, [pathname]);

  return (
    <RoomProvider id={roomId}>
      <Live roomId={roomId}>
        <div className={styles.shell}>
          <div className={styles.railColumn}>
            <header className={styles.railHead}>
              <Link href="/" className={styles.wordmark} aria-label="Tari, home">
                <FoxMark className={styles.fox} />
              </Link>
              <div className={styles.railActs}>
                <Link href="/kit" className={styles.kitLink} title="What to carry">
                  Kit
                </Link>
                <button
                  type="button"
                  className={styles.ask}
                  onClick={() => setAsking(true)}
                  aria-label="Go to a room"
                >
                  <kbd>⌘K</kbd>
                </button>
              </div>
            </header>
            <Rail signedIn={handle !== null} />
            <You handle={handle} canSignIn={canSignIn} />
          </div>

          <main className={styles.stage}>{children}</main>

          <People />
        </div>
      </Live>
      <Command open={asking} onClose={() => setAsking(false)} />
    </RoomProvider>
  );
}
