/* WHAT IS HAPPENING — the third column. docs/DIRECTION.md §3.1.
 *
 * HEADLINE, SOURCE AND LINK. That is the entire row, and the rule behind it is
 * not a style preference: a headline sends Wowhead traffic, and their prose
 * reprinted here makes Tari a competitor they can act against. There is no
 * body in the table (db/schema.sql) so there is none to draw, and no summary
 * is generated from one.
 *
 * EVERY ROW LEAVES. `target="_blank"` on all of them, because the reader is on
 * a second monitor with the game on the first and a link that replaces Tari
 * costs them their place. `rel="noreferrer"` is deliberate on top of
 * `noopener`: it is the one thing a feed reader owes nobody.
 *
 * AN OUTAGE IS NOT NEWS. §Failure behaviour: if a source is down or
 * rate-limited the column shows what it already has and says nothing about it.
 * lib/news.ts answers an empty list rather than throwing, so the worst case
 * here is a quiet column and never a red box. */

import { SOURCE_LABEL, type NewsItem } from "@/lib/news";

import styles from "./home.module.css";

/** Feed dates against the reader's own clock, in the mono read-out's grain.
 *  Days only: an hours-old headline and a four-hour-old headline are the same
 *  news, and a minute counter on a column that refreshes daily would be
 *  precision the pipe does not have. */
function on(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function What({ news }: { news: NewsItem[] }) {
  return (
    <section className={styles.column} aria-label="What is happening">
      <p className={styles.blockName}>Classic news</p>

      {news.length === 0 ? (
        <p className={styles.empty}>Nothing has come through the feed yet.</p>
      ) : (
        <ul className={styles.news}>
          {news.map((item) => (
            <li key={item.id} className={styles.story}>
              <a
                className={styles.storyLink}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.image ? (
                  <img
                    className={styles.storyArt}
                    src={item.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                ) : null}
                <span className={styles.storyHead}>{item.title}</span>
                <span className={styles.storyMeta}>
                  {SOURCE_LABEL[item.source] ?? item.source} · {on(item.at)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
