/* The campfire, on the landing page.
 *
 * SIZE IS THE BRIEF. This section sits between two full-size windows on the
 * product — the character sheet above, the deck below — and its job is to be
 * the breath between them. So it is deliberately the smallest thing on the
 * page after the hero's chip: two columns, one screenful of nothing much,
 * and no attempt to show the whole of /campfire.
 *
 * An earlier pass lifted three of the real page's panels in at full width and
 * stacked them. Everything in it was true and it was the wrong shape: a third
 * extra-large slab in a row of extra-large slabs.
 *
 * What survives the cut is the letter — the register, and the thing no other
 * companion app does — and ONE card, so the reader can see that the sentences
 * are backed by something. The trainer visit is the right one to keep: it is
 * the only card on the real page carrying the green. */

import RA from "@/components/RA";

import styles from "./fire.module.css";

const ICON = (stem: string) => `https://render.worldofwarcraft.com/us/icons/56/${stem}.jpg`;

/* A real druid's, from a live /campfire at 33. */
const RANKS = [
  { icon: "ability_druid_demoralizingroar", name: "Demoralizing Roar", rank: "Rank 3", note: "Up from the 2 on your bar" },
  { icon: "ability_druid_ferociousbite", name: "Ferocious Bite", rank: "Rank 1", note: "New to you" },
  { icon: "spell_nature_healingtouch", name: "Healing Touch", rank: "Rank 6", note: "Up from the 5 on your bar" },
];

export default function Fire() {
  return (
    <div className={styles.fire}>
      <figure className={styles.letter}>
        <RA name="campfire" className={styles.letterMark} />
        <p className={styles.lede}>Sixteen trainer ranks waiting, over two visits.</p>
        <p>A class chain starts in Moonglade.</p>
        <p>Nine of your slots fill in Wetlands and Duskwood.</p>
        <figcaption>
          <span className={styles.sign}>Tari</span>
          <span>written the moment you get back, never while you are out</span>
        </figcaption>
      </figure>

      <aside className={styles.card}>
        <header className={styles.cardHead}>
          <span className={styles.cardTitle}>
            <RA name="book" className={styles.cardMark} />
            <h3>At your trainer</h3>
          </span>
          <span className={styles.cardNote}>4g 0s 0c</span>
        </header>

        <div className={styles.visit}>
          <span className={styles.level}>
            Level 32
            {/* The one green here, and on the real page: the newest visit you
                have not bought. Nothing else is asking for anything. */}
            <i className={styles.fresh} aria-hidden="true" />
          </span>
          <span className={styles.visitLine}>5 abilities · the newest you have not bought</span>
        </div>

        <ul className={styles.list}>
          {RANKS.map((r) => (
            <li key={r.name}>
              <img src={ICON(r.icon)} alt="" width={28} height={28} loading="lazy" />
              <span className={styles.words}>
                <span className={styles.name}>
                  {r.name} <em>{r.rank}</em>
                </span>
                <span className={styles.line}>{r.note}</span>
              </span>
              <span className={styles.cost}>80s</span>
            </li>
          ))}
          <li className={styles.more}>and two more</li>
        </ul>
      </aside>
    </div>
  );
}
