/* /lab/map — the framed map, alone.
 *
 * The same ZoneMap the room mounts, set on the dark ground with nothing
 * around it, so the pin can be looked at without the room. The plate and
 * its registration live in lib/maps.ts. A working surface, not a shipped
 * page. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ZoneMap from "@/components/ZoneMap";
import { plateFor } from "@/lib/maps";

import styles from "./map.module.css";

export const metadata: Metadata = {
  title: "Map · Lab · Tari",
  description: "A zone plate with the authored layer on it.",
  robots: { index: false, follow: false },
};

export default async function MapPage() {
  const plate = await plateFor("eastern-plaguelands");
  if (!plate) notFound();
  return (
    <main className={styles.lab}>
      <p className={styles.eyebrow}>Tari · lab · Eastern Plaguelands · {plate.pins.length} pins from pfQuest</p>
      <div className={styles.stage}>
        <ZoneMap plate={plate} title="Eastern Plaguelands" />
      </div>
    </main>
  );
}
