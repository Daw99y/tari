/* The landing page, hero only. docs/TARI.md §14 step 3.
 *
 * One full-bleed room: the trainer hall, graded dark, with the game's own
 * Seduction visual playing over the one figure standing in it, read live
 * from the 1.12 .m2 file (see /lab). A title card in the lower left. The
 * line is a draft for Kacey to redline (§15.6). */

import FoxMark from "@/components/FoxMark";
import HeroScene from "@/components/HeroScene";
import { hasAuth, signIn } from "@/lib/auth";
import { FIRST_ROOM } from "@/lib/rooms";

import styles from "./page.module.css";

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
        /* Straight into the shell. Coming back to the landing page signed in
           would be a door that opens onto the doorstep. */
        await signIn("discord", { redirectTo: FIRST_ROOM });
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
        figureClassName={styles.figure}
        effectClassName={styles.effect}
        shadowClassName={styles.figureShadow}
        src="/RLextras/trainer-hall.webp"
        width={2560}
        height={1429}
        alt=""
        anchor={{ x: 0.3, y: 0.82 }}
        size={0.24}
        portraitAnchor={{ x: 0.2, y: 0.73 }}
        portraitSize={0.15}
        portraitPosition={{ x: 0.16, y: 0.5 }}
        effectSrc="/lab/m2/Seduction_State_Head.m2"
      />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.bar}>
        <a href="/" className={styles.wordmark} aria-label="Tari, home">
          <FoxMark className={styles.fox} />
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

      <p className={styles.credit}>HumanFemale.m2, Stun · Seduction_State_Head.m2 · read live from the 1.12 client</p>
    </main>
  );
}
