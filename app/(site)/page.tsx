/* The landing page. docs/TARI.md §14 step 3.
 *
 * Full-bleed exactly once: the hero — a human rogue in the Undercity, held
 * by Seduction, in no hurry. Below it the page is white, quiet, and every
 * section is built around one framed picture of the product rather than a
 * paragraph about it. The feed ends. So does the page. */

import Debuff from "@/components/Debuff";
import DragStrip from "@/components/DragStrip";
import FoxMark from "@/components/FoxMark";
import HeroScene from "@/components/HeroScene";
import { hasAuth, signIn } from "@/lib/auth";
import { FIRST_ROOM, ROOMS, getRoom, roomArt, roomThumb } from "@/lib/rooms";

import styles from "./page.module.css";

function DiscordButton({ onPaper = false }: { onPaper?: boolean }) {
  const cls = `${styles.button} ${onPaper ? styles.buttonPaper : ""}`;
  if (!hasAuth()) {
    return (
      <span className={`${cls} ${styles.buttonQuiet}`} aria-disabled="true">
        Sign-in opens soon
      </span>
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
      <button type="submit" className={cls}>
        Continue with Discord
      </button>
    </form>
  );
}

/* The status effects, read the other way round (§7). */
const STOPPED = [
  { kind: "seduced", name: "Seduced", note: "You stood there. You didn't mind." },
  { kind: "sapped", name: "Sapped", note: "You stopped and looked." },
  { kind: "rooted", name: "Rooted", note: "You stayed somewhere." },
  { kind: "rested", name: "Rested", note: "The game pays you to stop. It agrees with us." },
] as const;

/* What the mock shell shows. Real rooms; the people are invented. */
const RAIL = ["stormwind-city", "ironforge", "undercity", "darnassus", "orgrimmar", "thunder-bluff"].map(
  (id) => getRoom(id)!,
);
const HERE = [
  ["Grubnuk", "24 Rogue", "Whitemane"],
  ["Ashvale", "31 Priest", "Firemaw"],
  ["Tomkin", "27 Warrior", "Arugal"],
  ["Sibyl", "60 Mage", "Gehennas"],
  ["Ordo", "22 Warlock", "Whitemane"],
];

/* Six of the seventy-five: one city, one dungeon, one raid, and the weather
 * in between. The whole sheet lives in the app's rail — 75 stamps on a
 * landing page sells none of them. */
const SHOWN = ["stranglethorn-vale", "stratholme", "winterspring", "ironforge", "moonglade", "molten-core"].map(
  (id) => getRoom(id)!,
);

/* §13. Each one is something a growth team ships. */
const REFUSALS = [
  ["No notifications while you're playing.", "Tari will never pull you out."],
  ["No streaks.", "Nothing punishes a week off."],
  ["No infinite scroll.", "The feed ends, the way the evening ends."],
  ["No ranking of players against each other.", ""],
  ["No number that only goes up.", "No karma, no followers, no points."],
  ["No route, no arrow, no waypoint.", "No clock that counts up."],
];

export default function Page() {
  return (
    <main className={styles.page}>
      {/* ================= the hero: the one full-bleed surface */}
      <section className={styles.hero} aria-labelledby="hero-h">
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
            <span>Tari</span>
          </a>
          <DiscordButton />
        </header>

        <div className={styles.title}>
          <h1 id="hero-h" className={styles.h1}>
            You've been stopped.
          </h1>
          <p className={styles.lede}>
            Every tool for this game moves you through it faster.
            <br />
            Tari is the one where you stay a while.
          </p>
        </div>

        <p className={styles.credit}>Undercity · Human rogue · Seduction · read live from the 1.12 client</p>
      </section>

      {/* ================= the idea */}
      <section className={styles.section} aria-labelledby="idea-h">
        <div className={styles.copy}>
          <h2 id="idea-h" className={styles.h2}>
            In the game, being stopped is a loss of control.
            <span className={styles.h2Mute}> In Tari, it's what you came for.</span>
          </h2>
        </div>
        <ul className={styles.effects} role="list">
          {STOPPED.map((e) => (
            <li key={e.kind}>
              <Debuff large kind={e.kind} name={e.name} note={e.note} />
            </li>
          ))}
        </ul>
        <p className={styles.caption}>The debuff bar, the other way round. It fills. It stays full.</p>
      </section>

      {/* ================= the room */}
      <section className={`${styles.section} ${styles.band}`} aria-labelledby="room-h">
        <div className={styles.copy}>
          <h2 id="room-h" className={styles.h2}>
            Every zone is a room.
            <span className={styles.h2Mute}> Everyone standing in it is there with you.</span>
          </h2>
          <p className={styles.body}>
            Classic is three hundred realms that can't see each other. Tari is the one Azeroth
            where they can — every realm, every region, both factions, live.
          </p>
        </div>

        {/* the shell, drawn small */}
        <div className={styles.frame} aria-label="The Tari app: a rail of rooms, the Undercity, and who is in it">
          <div className={styles.shell}>
            <aside className={styles.shellRail}>
              <p className={styles.shellHead}>Cities</p>
              {RAIL.map((r) => (
                <p key={r.id} className={styles.shellRoom} data-on={r.id === "undercity" || undefined}>
                  <img src={roomThumb(r.id)} alt="" loading="lazy" />
                  <span>{r.name}</span>
                </p>
              ))}
            </aside>
            <div className={styles.shellRoomView}>
              <img src={roomArt("undercity")} alt="" loading="lazy" className={styles.shellArt} />
              <div className={styles.shellScrim} />
              <div className={styles.shellTitle}>
                <p className={styles.shellName}>Undercity</p>
                <p className={styles.shellLine}>
                  14 here <span>·</span> 6 outside in Tirisfal Glades
                </p>
              </div>
            </div>
            <aside className={styles.shellPeople}>
              <p className={styles.shellHead}>In the room</p>
              {HERE.map(([who, what, realm]) => (
                <p key={who} className={styles.shellPerson}>
                  <span>{who}</span>
                  <span className={styles.shellMeta}>
                    {what} · {realm}
                  </span>
                </p>
              ))}
            </aside>
          </div>
        </div>
        <p className={styles.caption}>A quiet room points next door instead of showing you a zero.</p>
      </section>

      {/* ================= the pin */}
      <section className={styles.section} aria-labelledby="pin-h">
        <div className={styles.copy}>
          <h2 id="pin-h" className={styles.h2}>
            One person. One spot. One sentence.
            <span className={styles.h2Mute}> It stays.</span>
          </h2>
          <p className={styles.body}>
            The next player to reach that spot at that level sees it. No order, no path between
            pins, nothing to collect. It points at something with no reward attached — and it's
            worth more next year, when more people get there.
          </p>
        </div>

        <div className={`${styles.frame} ${styles.frameWide}`}>
          <img src={roomArt("duskwood")} alt="" loading="lazy" className={styles.frameArt} />
          <div className={styles.pin} style={{ left: "58%", top: "46%" }}>
            <span className={styles.pinMark} aria-hidden="true" />
            <span className={styles.pinCard}>
              <span className={styles.pinText}>Stand on the bridge at dusk and look east. Nobody does.</span>
              <span className={styles.pinMeta}>Grubnuk · at 24 · Whitemane</span>
            </span>
          </div>
        </div>
        <p className={styles.caption}>Tari states the fact. Another player waves at it.</p>
      </section>

      {/* ================= the world */}
      <section className={`${styles.section} ${styles.band}`} aria-labelledby="world-h">
        <div className={styles.copy}>
          <h2 id="world-h" className={styles.h2}>
            {ROOMS.length} rooms.
            <span className={styles.h2Mute}> Photographed, not rendered.</span>
          </h2>
          <p className={styles.body}>
            Every zone, dungeon, raid and city in the old world, shot in-game at the right hour.
            When the new world opens, its rooms fill the same day — by the people standing in
            them.
          </p>
        </div>

        <DragStrip
          className={styles.strip}
          label={`Six of the ${ROOMS.length} rooms. Drag or scroll sideways.`}
        >
          {SHOWN.map((r) => (
            <figure key={r.id} className={styles.slide}>
              <img
                src={roomArt(r.id)}
                alt={r.name}
                loading="lazy"
                draggable={false}
                className={styles.slideArt}
              />
              <figcaption className={styles.slideName}>
                <span className={styles.slideRoom}>{r.name}</span>
                <span className={styles.slideMeta}>{r.kind}</span>
              </figcaption>
            </figure>
          ))}
        </DragStrip>
      </section>

      {/* ================= the refusals */}
      <section className={styles.section} aria-labelledby="no-h">
        <div className={styles.copy}>
          <h2 id="no-h" className={styles.h2}>
            What Tari won't do.
            <span className={styles.h2Mute}> A growth team would be fired for this list.</span>
          </h2>
        </div>
        <ul className={styles.noList} role="list">
          {REFUSALS.map(([what, then]) => (
            <li key={what} className={styles.no}>
              <span className={styles.noWhat}>{what}</span>
              {then ? <span className={styles.noThen}>{then}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      {/* ================= the name, and the end */}
      <section className={`${styles.section} ${styles.band} ${styles.end}`} aria-labelledby="name-h">
        <div className={styles.copy}>
          <FoxMark className={styles.endFox} />
          <h2 id="name-h" className={styles.h2}>
            Thrall called her Tari.
          </h2>
          <p className={styles.body}>
            Taretha Foxton grew up beside him at Durnholde, taught him to read in secret, and
            helped him out. She noticed, remembered, and helped without being asked, across the
            widest divide in the setting. A companion. The mark is a fox.
          </p>
          <div className={styles.endCta}>
            <DiscordButton onPaper />
          </div>
        </div>
        <p className={styles.small}>
          Open before the fresh realms are. Not affiliated with Blizzard Entertainment — World of
          Warcraft and its art are theirs. The room is ours.
        </p>
      </section>
    </main>
  );
}
