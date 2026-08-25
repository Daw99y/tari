"use client";

/* ⌘K — you are asking Tari (docs/TARI.md §11.3).
 *
 * Rooms only, for now. Items and people join the same list when there is an
 * index to search; the surface does not change when they do.
 *
 * It lives in the shell rather than in the room, so it is above everything
 * and survives every navigation — the point of the shell in one component. */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { KIND_LABEL, ROOMS } from "@/lib/rooms";

import styles from "./shell.module.css";

const LIMIT = 7;

export default function Command({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ROOMS.slice(0, LIMIT);
    /* Rooms whose name starts with what you typed come first — typing "st"
       should offer Stormwind before Blasted Lands. */
    const starts = ROOMS.filter((r) => r.name.toLowerCase().startsWith(needle));
    const rest = ROOMS.filter(
      (r) => !r.name.toLowerCase().startsWith(needle) && r.name.toLowerCase().includes(needle)
    );
    return [...starts, ...rest].slice(0, LIMIT);
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setAt(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setAt(0);
  }, [q]);

  if (!open) return null;

  function go(id: string) {
    router.push(`/r/${id}`);
    onClose();
  }

  return (
    <div
      className={styles.commandVeil}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.command} role="dialog" aria-modal="true" aria-label="Go to a room">
        <input
          ref={inputRef}
          className={styles.commandInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Where are you going?"
          aria-label="Where are you going?"
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAt((i) => (i + 1) % Math.max(hits.length, 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setAt((i) => (i - 1 + hits.length) % Math.max(hits.length, 1));
            }
            if (e.key === "Enter" && hits[at]) go(hits[at].id);
          }}
        />
        {hits.length === 0 ? (
          <p className={styles.commandEmpty}>No room by that name. Try the zone it sits in.</p>
        ) : (
          <ul className={styles.commandList}>
            {hits.map((room, i) => (
              <li key={room.id}>
                <button
                  type="button"
                  className={styles.commandHit}
                  data-at={i === at || undefined}
                  onPointerEnter={() => setAt(i)}
                  onClick={() => go(room.id)}
                >
                  <span>{room.name}</span>
                  <span className={styles.commandKind}>{KIND_LABEL[room.kind]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
