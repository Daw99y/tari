/* The debuff frame, redrawn. In the game this box counts down and you wait
 * for it to end. Here the bar fills and stays full: the one status effect
 * that does not wear off. The page's signature (docs/TARI.md §7). */

import type { CSSProperties } from "react";

import styles from "./debuff.module.css";

export type DebuffKind = "seduced" | "sapped" | "rooted" | "rested";

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
  const stroke = kind === "rooted";
  return (
    <div className={`${styles.frame} ${large ? styles.large : ""} ${className ?? ""}`} style={style} data-kind={kind}>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d={GLYPH[kind]}
          fill={stroke ? "none" : "currentColor"}
          stroke={stroke ? "currentColor" : "none"}
          strokeWidth={stroke ? 1.8 : 0}
          strokeLinecap="round"
        />
      </svg>
      <div className={styles.text}>
        <p className={styles.name}>{name}</p>
        {note ? <p className={styles.note}>{note}</p> : null}
        <span className={styles.bar} aria-hidden="true">
          <span className={styles.barFill} style={{ transform: `scaleX(${fill})` }} />
        </span>
      </div>
    </div>
  );
}
