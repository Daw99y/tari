/* The landing page. docs/TARI.md §14 step 3.
 *
 * Warm dark, round type, chunky cards — and inside every rounded window, the
 * product itself: the shell's own CSS drawing the rail, the room and the
 * column at true size, scaled down like a print (app/(site)/mock). The frames
 * are playful; the product inside them is the product. Every claim is checked
 * against the repo, and the people named in mocks are invented (the captions
 * say so). */

import ReactDOM from "react-dom";

import Debuff from "@/components/Debuff";
import FoxMark from "@/components/FoxMark";
import HeroCurtain from "./HeroCurtain";
import M2Sprite from "@/components/M2Sprite";
import { auth, hasAuth, signIn } from "@/lib/auth";
import { FIRST_ROOM, roomThumb } from "@/lib/rooms";
import { SUCCUBUS_ASSETS } from "@/lib/succubus";

import Reveal from "./Reveal";
import Scaled from "./mock/Scaled";
import { SHOT_H, SHOT_W } from "./mock/shots";
import mock from "./mock/mock.module.css";
import styles from "./page.module.css";

/* Discord's own mark, from their brand kit. The door is theirs, so it wears
 * their face: blurple, the clyde, and nothing of ours on it. */
function Clyde() {
  return (
    <svg className={styles.clyde} viewBox="0 0 127.14 96.36" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z"
      />
    </svg>
  );
}

/* The one control on the page, in its three honest states: no door on this
 * deploy, a door you have not walked through, and a door you already have.
 * Somebody signed in is not asked to sign in again — the button drops the
 * blurple, takes Tari's own colour, and just opens the world. */
async function DiscordButton() {
  if (!hasAuth()) {
    return (
      <span className={`${styles.button} ${styles.buttonQuiet}`} aria-disabled="true">
        <Clyde />
        Sign-in opens soon
      </span>
    );
  }

  const session = await auth();
  if (session?.user) {
    return (
      <a href={FIRST_ROOM} className={`${styles.button} ${styles.enter}`}>
        <FoxMark className={styles.buttonFox} />
        Walk back in
      </a>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        // Straight into the shell. No doorstep.
        await signIn("discord", { redirectTo: FIRST_ROOM });
      }}
    >
      <button type="submit" className={`${styles.button} ${styles.discord}`}>
        <Clyde />
        Enter with Discord
      </button>
    </form>
  );
}

/* ---- the effects: the status bar, read the other way round */

const STOPPED = [
  { kind: "seduced", name: "Seduced", note: "You didn't want to move.", m2: "/lab/m2/Seduction_State_Head.m2", zoom: 2 },
  { kind: "sapped", name: "Sapped", note: "You stopped to look.", m2: "/lab/m2/Sap_State_Head.m2", zoom: 1.15 },
  { kind: "rooted", name: "Rooted", note: "Still here, an hour later.", m2: "/lab/m2/EntanglingRoots_State.m2", zoom: 1.1 },
  { kind: "rested", name: "Rested", note: "Paid to do nothing.", m2: "/lab/m2/Sleep_State_Head.m2", zoom: 1.15 },
] as const;

/* ---- the world: five rooms in the hand, the rest counted */

const HAND = ["stormwind-city", "stranglethorn-vale", "winterspring", "zul-gurub", "orgrimmar"];
const HAND_NAME: Record<string, string> = {
  "stormwind-city": "Stormwind",
  "stranglethorn-vale": "Stranglethorn Vale",
  winterspring: "Winterspring",
  "zul-gurub": "Zul’Gurub",
  orgrimmar: "Orgrimmar",
};

/* ---- what a growth team ships by default, refused line by line */

/* Each line is a PROPERTY, not a feature we declined to build. A refusal
 * named after a feature dies the day the feature arrives wearing a better
 * shape — "no notifications" was false the moment a reminder to go fishing
 * was worth sending. A property survives it. docs/WELCOME.md §8. */
const REFUSALS = [
  ["Nothing interrupts.", "Tari never rings mid-dungeon."],
  ["Nothing punishes a week off.", "Come back in a month. Nothing was lost."],
  ["Nothing scrolls forever.", "The page ends."],
  ["Nothing ranks you.", "You are not in a table with other people."],
  ["Nothing only goes up.", "No points, no score, no counts."],
  ["Nothing points.", "A pin says look, never go."],
];

export default async function Page() {
  /* The curtain's succubus, asked for in the document head.
   *
   * This is the reason she and not the rogue holds the wait. Her five files
   * are a constant, so the browser is told about them in the same response as
   * the HTML and starts all five immediately. The rogue's list is inside a
   * manifest she has to fetch first, so nothing of hers can begin until a
   * round trip has already been spent — which is exactly the gap the curtain
   * covers. */
  ReactDOM.preload(SUCCUBUS_ASSETS.model, { as: "fetch", crossOrigin: "anonymous" });
  for (const url of SUCCUBUS_ASSETS.textures) ReactDOM.preload(url, { as: "image" });

  return (
    <main className={styles.page}>
      {/* ================= the hero */}
      <section className={styles.hero} aria-labelledby="hero-h">
        <HeroCurtain
          className={styles.scene}
          imageClassName={styles.room}
          figureClassName={styles.figure}
          effectClassName={styles.effect}
          shadowClassName={styles.figureShadow}
          src="/RLextras/hillsbrad-hero.webp"
          width={3200}
          height={1786}
          alt=""
          anchor={{ x: 0.36, y: 0.8 }}
          size={0.3}
          portraitAnchor={{ x: 0.24, y: 0.8 }}
          portraitSize={0.15}
          portraitPosition={{ x: 0.16, y: 0.5 }}
          effectSrc="/lab/m2/Seduction_State_Head.m2"
          chip={{ name: "Seduced", note: "Does not wear off" }}
        />
        <div className={styles.scrim} aria-hidden="true" />

        <header className={styles.bar}>
          <a href="/" className={styles.wordmark} aria-label="Tari, home">
            <FoxMark className={styles.fox} />
          </a>
          <DiscordButton />
        </header>

        <div className={styles.title}>
          <p className={styles.badge} data-tone="lime">
            Early access · live now
          </p>
          <h1 id="hero-h" className={styles.h1}>
            One Azeroth.
            <br />
            <em>Everyone in it.</em>
          </h1>
          <p className={styles.lede}>Every zone is a live room. Every realm, both factions, one world. Walk in.</p>
        </div>

        <p className={styles.credit}>She has stood in Hillsbrad for an hour. Nobody made her.</p>
      </section>

      {/* ================= the idea */}
      <section className={styles.section} data-tone="pink" aria-labelledby="idea-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>The point</p>
          <h2 id="idea-h" className={styles.h2}>
            Built to <em>stop</em> you.
          </h2>
          <p className={styles.body}>The game's own model files, playing live in your browser. Not video.</p>
        </Reveal>
        <ul className={styles.effects} role="list">
          {STOPPED.map((e, i) => (
            <li key={e.kind}>
              <Reveal delay={i * 90} className={styles.effectCard}>
                <div className={styles.specimen}>
                  <M2Sprite src={e.m2} background="#0a0912" zoom={e.zoom} className={styles.specimenArt} />
                </div>
                <Debuff large kind={e.kind} name={e.name} note={e.note} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ================= presence: the app's own window on Undercity */}
      <section className={styles.section} data-tone="blue" aria-labelledby="room-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>Live rooms</p>
          <h2 id="room-h" className={styles.h2}>
            Walk in. <em>See who's there.</em>
          </h2>
          <p className={styles.body}>
            Every name in the column is standing in the room with you, live, from every realm. A quiet room points you
            next door.
          </p>
        </Reveal>
        <Reveal className={mock.appShot}>
          <Scaled src="/shot/undercity" width={SHOT_W} height={SHOT_H} />
        </Reveal>
        <p className={styles.caption}>The app, at size. Real room, invented people.</p>
      </section>

      {/* ================= the sheet: /you, as the app draws it */}
      <section className={styles.section} data-tone="gold" aria-labelledby="you-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>Your character</p>
          <h2 id="you-h" className={styles.h2}>
            Paste one line. <em>That's you.</em>
          </h2>
          <p className={styles.body}>
            Type <code className={styles.code}>/tari</code> in game and paste the line it gives you. Your character
            steps out, gear and all, with a green arrow on every slot the world can do better. Hover anything for the
            real tooltip.
          </p>
        </Reveal>
        <Reveal className={mock.appShot}>
          <Scaled src="/shot/you" width={SHOT_W} height={SHOT_H} />
        </Reveal>
        <p className={styles.caption}>Live 3D from the 1.12 client. Yours stands at /you. Armory import works too.</p>
      </section>

      {/* ================= the deck: what the room tells, and what people leave */}
      <section className={styles.section} data-tone="purple" aria-labelledby="guide-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>The deck</p>
          <h2 id="guide-h" className={styles.h2}>
            Lore you can <em>pick up.</em>
          </h2>
          <p className={styles.body}>
            Every room deals its story as things: chips, graves, pages, yells. Players pin one sentence where they
            stood. Leave one of your own.
          </p>
        </Reveal>
        <Reveal className={mock.appShot}>
          <Scaled src="/shot/duskwood" width={SHOT_W} height={SHOT_H} />
        </Reveal>
        <p className={styles.caption}>Spoilers stay buried until you dig. The deck ends; there is no feed under it.</p>
      </section>

      {/* ================= the world */}
      <section className={styles.section} data-tone="green" aria-labelledby="world-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>The world</p>
          <h2 id="world-h" className={styles.h2}>
            79 rooms. <em>All real.</em>
          </h2>
          <p className={styles.body}>Every zone, dungeon, raid and city, shot in-game at the right hour.</p>
        </Reveal>
        <Reveal className={styles.hand}>
          {HAND.map((id) => (
            <figure key={id} className={styles.handCard}>
              <img src={roomThumb(id)} alt={HAND_NAME[id]} loading="lazy" decoding="async" />
              <figcaption>{HAND_NAME[id]}</figcaption>
            </figure>
          ))}
        </Reveal>
        <Reveal className={styles.handMore}>
          <span className={styles.badge}>+ 74 more</span>
        </Reveal>
      </section>

      {/* ================= classic+ */}
      <section className={styles.section} data-tone="gold" aria-labelledby="plus-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>Classic+</p>
          <h2 id="plus-h" className={styles.h2}>
            Classic+ drops? <em>Day one.</em>
          </h2>
          <p className={styles.body}>
            Nothing here is welded to one Azeroth. If we can read the new world, new zones become new rooms the day
            they open, shot by the players standing in them.
          </p>
        </Reveal>
        <Reveal className={styles.plusRow}>
          <figure className={styles.plusCell}>
            <img src={roomThumb("duskwood")} alt="" loading="lazy" />
            <figcaption>Duskwood · day one</figcaption>
          </figure>
          <figure className={`${styles.plusCell} ${styles.plusEmpty}`}>
            <figcaption>New zone · unmapped</figcaption>
          </figure>
          <figure className={`${styles.plusCell} ${styles.plusEmpty}`}>
            <figcaption>New dungeon · unmapped</figcaption>
          </figure>
          <figure className={`${styles.plusCell} ${styles.plusEmpty}`}>
            <figcaption>New raid · unmapped</figcaption>
          </figure>
        </Reveal>
      </section>

      {/* ================= the refusals */}
      <section className={styles.section} data-tone="blue" aria-labelledby="no-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>Promises</p>
          <h2 id="no-h" className={styles.h2}>
            Stuff we <em>won't</em> do.
          </h2>
        </Reveal>
        <ul className={styles.noList} role="list">
          {REFUSALS.map(([what, then], i) => (
            <li key={what}>
              <Reveal delay={(i % 2) * 80} className={styles.no}>
                <span className={styles.noWell} aria-hidden="true">
                  <svg viewBox="0 0 24 24" className={styles.noGlyph}>
                    <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M6.1 17.9 17.9 6.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span className={styles.noRing} />
                </span>
                <span className={styles.noText}>
                  <span className={styles.noWhat}>{what}</span>
                  <span className={styles.noThen}>{then}</span>
                  <span className={styles.noBar} aria-hidden="true" />
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ================= the name, and the end */}
      <section className={`${styles.section} ${styles.end}`} data-tone="pink" aria-labelledby="name-h">
        <Reveal className={styles.copy}>
          <FoxMark className={styles.endFox} />
          <h2 id="name-h" className={styles.h2}>
            Thrall called her <em>Tari.</em>
          </h2>
          <p className={styles.body}>
            Taretha taught a captive orc to read, in secret. Notice things, remember them, help unasked. That's the
            whole app. The mark is a T with a fox tail.
          </p>
          <div className={styles.endCta}>
            <DiscordButton />
          </div>
        </Reveal>
        <p className={styles.small}>
          Open before the fresh realms are. Not affiliated with Blizzard Entertainment. World of Warcraft and its art
          are theirs. The rooms are ours.
        </p>
      </section>
    </main>
  );
}
