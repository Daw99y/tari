/* THE PIN'S FACE. docs/PINS.md: the Seduced widget from the landing page,
 * carried into the room. Same glass, same pink, same bar — and the bar is
 * the meaning now: it fills once and never drains, because a pin does not
 * wear off.
 *
 * The icon is the game's own treasure map (INV_Misc_Map_01) — X marks the
 * spot — and it wears it everywhere the pin appears (Kacey, 2026-08-26:
 * the app should feel like the world; the more of the game's own objects,
 * the better). The drawn aggro `!` stays in the file for the vocabulary. */

import { CLASS_COLOR } from "@/lib/class-color";
import { pinAge } from "@/lib/pins";
import type { ClassId } from "@/lib/types";

import styles from "./pin-chip.module.css";

/** The pin's object: the game's treasure map, X marking the spot. */
export function PinFace({ className }: { className?: string }) {
  return <img className={className} src="/pins/map-x.png" alt="" draggable={false} />;
}

export function PinGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.1 2.6 16.4 3.4 13.6 14.6 11.3 14.1 Z" />
      <circle cx="11.9" cy="18.8" r="2" />
    </svg>
  );
}

export default function PinChip({
  body,
  who,
  cls,
  level,
  at,
  className,
}: {
  body: string;
  who: string;
  cls: ClassId;
  level: number;
  at: string;
  className?: string;
}) {
  return (
    <div className={`${styles.frame} ${className ?? ""}`}>
      <span className={styles.icon}>
        <PinFace className={styles.face} />
      </span>
      <div className={styles.text}>
        <p className={styles.said}>{body}</p>
        <p className={styles.note}>
          <span style={{ color: CLASS_COLOR[cls] }}>{who}</span>
          {` · ${level} · ${pinAge(at)}`}
        </p>
        <span className={styles.bar} aria-hidden="true">
          <span className={styles.fill} />
        </span>
      </div>
    </div>
  );
}
