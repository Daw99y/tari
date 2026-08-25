"use client";

/* THE SHELL. It mounts once and never unmounts again.
 *
 * Everything in this file is here because it must survive a room change:
 * the rail, the people column, ⌘K, and — when it lands — the one socket.
 *
 * THE LIVEBLOCKS SEAM. docs/SHELL.md puts a single <LiveblocksProvider>
 * right here and a <RoomProvider> down in the room's page, so changing room
 * is a message on an open socket rather than a fresh handshake. The package
 * is not installed and the account is not bought (docs/TARI.md §8 flags the
 * per-user pricing as a thing to price first), so the provider is not faked.
 * It wraps <div className={styles.shell}> on the day it arrives, and no
 * other file in this folder has to move.
 *
 * The current room comes from the URL, read once here and handed down. */

import { usePathname, useRouter, useSelectedLayoutSegments } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

import FoxMark from "@/components/FoxMark";
import { loadCharacter } from "@/lib/character";

import Command from "./Command";
import People from "./People";
import Rail from "./Rail";
import { RoomProvider } from "./room-context";
import styles from "./shell.module.css";

export default function Shell({
  handle,
  children,
}: {
  handle: string | null;
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
      <div className={styles.shell}>
        <div className={styles.railColumn}>
          <header className={styles.railHead}>
            <Link href="/" className={styles.wordmark} aria-label="Tari, home">
              <FoxMark className={styles.fox} />
            </Link>
            <button
              type="button"
              className={styles.ask}
              onClick={() => setAsking(true)}
              aria-label="Go to a room"
            >
              <kbd>⌘K</kbd>
            </button>
          </header>
          <Rail />
          <footer className={styles.railFoot}>
            <Link href="/you" className={styles.you}>
              You
            </Link>
            <span>{handle ? `Signed in as ${handle}` : "Not signed in"}</span>
          </footer>
        </div>

        <main className={styles.stage}>{children}</main>

        <People />
      </div>
      <Command open={asking} onClose={() => setAsking(false)} />
    </RoomProvider>
  );
}
