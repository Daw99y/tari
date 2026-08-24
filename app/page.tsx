/* The landing page, hero only. docs/TARI.md §14 step 3.
 *
 * One full-bleed room: the trainer hall, graded dark, with the game's own
 * Seduction visual playing over the one figure standing in it, read live
 * from the 1.12 .m2 file (see /lab). A title card in the lower left. The
 * line is a draft for Kacey to redline (§15.6). */

import HeroScene from "@/components/HeroScene";
import { hasAuth, signIn } from "@/lib/auth";

import styles from "./page.module.css";

/** Placeholder until the fox is drawn (docs/TARI.md §15.3). */
function FoxMark() {
  return (
    <svg className={styles.fox} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3.5 9 8.5h6l6-5-1 9.5c0 4.4-3 7.4-8 8.5-5-1.1-8-4.1-8-8.5Z" />
      <circle cx="9.2" cy="13" r="1.1" fill="var(--ground)" />
      <circle cx="14.8" cy="13" r="1.1" fill="var(--ground)" />
    </svg>
  );
}

function DiscordButton() {
  if (!hasAuth()) {
    return (
      <span className={`${styles.button} ${styles.buttonQuiet}`} aria-disabled="true">
        Sign-in opens soon
      </span>
    );
  }
  return (
    <form
      action={async () => {
        "use server";
        await signIn("discord");
      }}
    >
      <button type="submit" className={styles.button}>
        Continue with Discord
      </button>
    </form>
  );
}

export default function Page() {
  return (
    <main className={styles.page}>
      <HeroScene
        className={styles.scene}
        imageClassName={styles.room}
        effectClassName={styles.effect}
        src="/RLextras/trainer-hall.webp"
        width={2560}
        height={1429}
        alt=""
        anchor={{ x: 0.29, y: 0.4 }}
        size={0.5}
        zoom={1.6}
        portraitPosition={{ x: 0.16, y: 0.5 }}
        effectSrc="/lab/m2/Seduction_State_Head.m2"
      />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.bar}>
        <a href="/" className={styles.wordmark} aria-label="Tari, home">
          <FoxMark />
          <span>Tari</span>
        </a>
        <DiscordButton />
      </header>

      <section className={styles.card} aria-labelledby="hero-h">
        <h1 id="hero-h" className={styles.h1}>
          You never logged out.
        </h1>
        <p className={styles.line}>Hearth home.</p>
      </section>

      <p className={styles.credit}>Seduction_State_Head.m2 · read live from the 1.12 client</p>
    </main>
  );
}
