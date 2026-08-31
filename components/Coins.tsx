/* THE MONEY, AS COINS. The game's money frame prints the number and then the
 * coin, and the coin's metal is the denomination — no "g", "s" or "c" in
 * sight. The corner of the sheet says it the same way; a screen reader gets
 * the letters back through lib/character's money(). */

import { money } from "@/lib/character";

import styles from "./coins.module.css";

export default function Coins({ copper }: { copper: number }) {
  const g = Math.floor(copper / 10000);
  const s = Math.floor((copper % 10000) / 100);
  const c = copper % 100;
  /* The same rule money() keeps: a higher coin drags the lower ones in, so
     "50s 0c" reads as a purse and not as a rounding. */
  const pieces: [string, number][] = g
    ? [["g", g], ["s", s], ["c", c]]
    : s
      ? [["s", s], ["c", c]]
      : [["c", c]];
  return (
    <span className={styles.coins} role="img" aria-label={money(copper)}>
      {pieces.map(([d, n]) => (
        <span key={d} className={styles.piece} aria-hidden="true">
          {n}
          <i className={styles.coin} data-coin={d} />
        </span>
      ))}
    </span>
  );
}
