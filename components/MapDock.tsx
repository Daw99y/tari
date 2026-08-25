"use client";

import { useEffect, useRef, useState } from "react";

import Compass from "@/components/Compass";
import ZoneMap from "@/components/ZoneMap";
import type { ZonePlate } from "@/lib/plate";

import styles from "./map-dock.module.css";

/* The dock. The compass holds the room's top-right corner; pressing it
 * unfolds the framed map, pressing it again folds the map back into the
 * corner. Whether the map stands open is the reader's choice and it is
 * remembered across rooms — one key, not one per zone, because "I read
 * with the map open" is a way of reading, not a fact about a place.
 * A first visit starts folded: the room's photograph is the greeting,
 * and the compass glints once to say it is there. */

const KEY = "tari:map";

export default function MapDock({ plate, title }: { plate: ZonePlate; title: string }) {
  const [open, setOpen] = useState(false);
  // The glint runs only while the reader has never opened the map.
  const [fresh, setFresh] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "open") setOpen(true);
    else if (saved === null) setFresh(true);
    mounted.current = true;
  }, []);

  function set(next: boolean) {
    setOpen(next);
    setFresh(false);
    localStorage.setItem(KEY, next ? "open" : "closed");
  }

  // Two ways out of the map, both meaning the same thing: anywhere that is
  // not the plate, and the key everyone already presses to leave something.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") set(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div
        className={styles.veil}
        data-open={open || undefined}
        aria-hidden="true"
        onClick={() => set(false)}
      />

      <div className={styles.panel} data-open={open || undefined} aria-hidden={!open} inert={!open}>
        <ZoneMap plate={plate} title={title} />
      </div>

      <button
        type="button"
        className={styles.compass}
        data-open={open || undefined}
        data-fresh={fresh || undefined}
        aria-pressed={open}
        aria-label={open ? "Fold the map" : "Open the map"}
        onClick={() => set(!open)}
      >
        <span className={styles.halo} aria-hidden="true" />
        <Compass className={styles.rose} />
        <span className={styles.word}>{open ? "Fold the map" : "Open the map"}</span>
      </button>
    </>
  );
}
