"use client";

/* The debuff frame, rebuilt on the game's own icon art. In the game this box
 * counts down and you wait for it to end. Here the timer is an infinity mark
 * and the bar fills once and stays full: the one status effect that does not
 * wear off. The page's signature (docs/TARI.md §7).
 *
 * The icon is the real one — Blizzard's render CDN serves the 1.12 icon set —
 * and a failed request falls back to the drawn glyph, so the frame never
 * shows a broken image. */

import { useState, type CSSProperties } from "react";

import styles from "./debuff.module.css";

export type DebuffKind = "seduced" | "sapped" | "rooted" | "rested";

/* The game's icon for each effect: Seduction, Sap, Entangling Roots, and the
 * moon the client uses for sleep — the closest thing rest has to a spell. */
const ICON: Record<DebuffKind, string> = {
  seduced: "spell_shadow_mindsteal",
  sapped: "ability_sap",
  rooted: "spell_nature_stranglevines",
  rested: "spell_nature_sleep",
};

/* The drawn glyphs, kept as the offline fallback. */
const GLYPH: Record<DebuffKind, string> = {
  seduced: "M12 20.5 4.5 13a4.4 4.4 0 0 1 6.2-6.2l1.3 1.3 1.3-1.3a4.4 4.4 0 0 1 6.2 6.2Z",
  sapped: "M5 6h9l-8.2 10H15v2H5l8.2-10H5Zm10-3h4l-3 4h3v1.6h-5l3-4h-2Z",
  rooted: "M12 3v18m0-8c-3 0-5 1-7 4m7-7c3 0 5 1 7 4m-7-3c-2 0-3-1-4-3m4 3c2 0 3-1 4-3",
  rested: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
};

type Props = {
  name: string;
  note?: string;
  kind?: DebuffKind;
  /** Bar as a fraction. Defaults to full — it never wears off. */
  fill?: number;
  large?: boolean;
  className?: string;
  style?: CSSProperties;
};

export default function Debuff({ name, note, kind = "seduced", fill = 1, large = false, className, style }: Props) {
  const [failed, setFailed] = useState(false);
  const stroke = kind === "rooted";

  return (
    <div className={`${styles.frame} ${large ? styles.large : ""} ${className ?? ""}`} style={style} data-kind={kind}>
      <span className={styles.well} aria-hidden="true">
        {failed ? (
          <svg className={styles.glyph} viewBox="0 0 24 24">
            <path
              d={GLYPH[kind]}
              fill={stroke ? "none" : "currentColor"}
              stroke={stroke ? "currentColor" : "none"}
              strokeWidth={stroke ? 1.8 : 0}
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <img
            className={styles.iconArt}
            src={`https://render.worldofwarcraft.com/us/icons/56/${ICON[kind]}.jpg`}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}
        <span className={styles.wellRing} />
      </span>

      <div className={styles.text}>
        <p className={styles.name}>
          {name}
          <span className={styles.forever} aria-hidden="true">
            ∞
          </span>
        </p>
        {note ? <p className={styles.note}>{note}</p> : null}
        <span className={styles.bar} aria-hidden="true">
          <span className={styles.barFill} style={{ transform: `scaleX(${fill})` }} />
        </span>
      </div>
    </div>
  );
}
