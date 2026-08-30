/* The landing page. docs/TARI.md §14 step 3.
 *
 * Warm dark, round type, chunky cards — and inside every rounded window, the
 * product drawn the way the app actually draws it: the room's centred title,
 * the sheet's glass slots, the guide's story card. The frames are playful;
 * the product inside them is 1:1. Every claim is checked against the repo,
 * and the people named in mocks are invented (the captions say so). */

import { promises as fs } from "node:fs";
import path from "node:path";

import Debuff from "@/components/Debuff";
import FoxMark from "@/components/FoxMark";
import HeroScene from "@/components/HeroScene";
import { ItemHover } from "@/components/ItemTooltip";
import M2Sprite from "@/components/M2Sprite";
import SlotGlyph from "@/components/SlotGlyph";
import { auth, hasAuth, signIn } from "@/lib/auth";
import { iconUrl, type Item } from "@/lib/loot";
import { plateItem } from "@/lib/plate-item";
import { FIRST_ROOM, roomArt, roomThumb } from "@/lib/rooms";
import type { WornItem } from "@/lib/worn";

import Reveal from "./Reveal";
import SheetFigure from "./SheetFigure";
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

/* ---- the sheet: the game's 19 slots in the game's order (lib/character.ts
 * SHEET_LEFT / SHEET_RIGHT / SHEET_BOTTOM), every slot filled.
 *
 * The gear she wears is the entries in components/SeducedFigure.tsx OUTFIT.
 * The rest are worn but not drawn, exactly as the client draws them: a helm
 * with Show Helm off, and the neck, rings and trinkets that have no model.
 * Her bow hangs in the ranged slot; the client only draws it when she pulls
 * it, and the left-hand socket already holds Vendetta. */

type SheetSlot = [label: string, entry?: number];

const SHEET_L: SheetSlot[] = [
  ["Head", 3020],
  ["Neck", 19541],
  ["Shoulder", 2264],
  ["Back", 13108],
  ["Chest", 4119],
  ["Shirt", 4336],
  ["Tabard", 19506],
  ["Wrist", 9455],
];
const SHEET_R: SheetSlot[] = [
  ["Hands", 6727],
  ["Waist", 20117],
  ["Legs", 9624],
  ["Feet", 20114],
  ["Finger", 13097],
  ["Finger", 9447],
  ["Trinket", 21119],
  ["Trinket", 4381],
];
const SHEET_W: SheetSlot[] = [["Main hand", 13033], ["Off hand", 776], ["Ranged", 6696]];
const HERO_LEVEL = 29;

/* A handful of dictionary rows carry no icon name — the girdle, the boots,
 * the medallion, the tabard. The wardrobe catalogue knows all four, because
 * the doll needs their art anyway, so the second store answers when the first
 * shrugs and no slot falls back to a drawn glyph. */
type Catalogue = { items: [number, number, ...unknown[]][]; display: Record<string, { i?: number }>; pool: string[] };

async function catalogueIcons(entries: number[]): Promise<Map<number, string>> {
  const file = path.join(process.cwd(), "public", "lab", "doll", "items", "catalogue.json");
  const cat = JSON.parse(await fs.readFile(file, "utf8")) as Catalogue;
  const out = new Map<number, string>();
  for (const entry of entries) {
    const row = cat.items.find((r) => r[0] === entry);
    const icon = row ? cat.display[row[1]]?.i : undefined;
    const stem = icon ? cat.pool[icon] : undefined;
    // `icons_inv_belt_17.webp` is the render CDN's `inv_belt_17`.
    if (stem) out.set(entry, stem.replace(/^icons_/, "").replace(/\.webp$/, ""));
  }
  return out;
}

async function sheetItems(): Promise<Map<number, Item>> {
  const raw = await fs.readFile(path.join(process.cwd(), "reference", "items.json"), "utf8");
  const dict = JSON.parse(raw) as Record<string, WornItem>;
  const worn = [...SHEET_L, ...SHEET_R, ...SHEET_W].flatMap(([, entry]) => (entry ? [entry] : []));
  const spares = await catalogueIcons(worn.filter((e) => !dict[e]?.i));
  const out = new Map<number, Item>();
  for (const entry of worn) {
    const row = dict[entry];
    if (!row) continue;
    const item = plateItem(entry, row);
    if (!item.iconName) item.iconName = spares.get(entry) ?? null;
    out.set(entry, item);
  }
  return out;
}

/* One slot card, the sheet's own: icon square, mono label, the name in its
 * quality colour. The right column faces its icons outward, as the game does. */
function Slot({
  label,
  item,
  align = "left",
}: {
  label: string;
  item?: Item;
  align?: "left" | "right";
}) {
  const body = (
    <>
      <span className={styles.slotWell} aria-hidden="true">
        {item && iconUrl(item) ? (
          <img src={iconUrl(item)!} alt="" width={56} height={56} loading="lazy" decoding="async" />
        ) : (
          <SlotGlyph slot={label} className={styles.slotGlyph} />
        )}
      </span>
      <span className={styles.slotText}>
        <span className={styles.slotLabel}>{label}</span>
        {item ? (
          <span className={styles.slotName} data-quality={item.quality}>
            {item.name}
          </span>
        ) : null}
      </span>
    </>
  );
  if (!item) {
    return (
      <span className={styles.slot} data-align={align} data-empty="">
        {body}
      </span>
    );
  }
  return (
    <ItemHover item={item} level={HERO_LEVEL} quiet tap className={styles.slot}>
      <span className={styles.slotInner} data-align={align}>
        {body}
      </span>
    </ItemHover>
  );
}

/* ---- the presence mock: a real room, invented people (the caption says so) */

const HERE = [
  ["Marrow", "29 Warlock · Firemaw"],
  ["Tansy", "41 Druid · Pyrewood Village"],
  ["Okto", "33 Hunter · Whitemane"],
  ["Bruk", "24 Warrior · Arugal"],
];

/* ---- the guide strip: the Duskwood deck's real icons */

const DUSKWOOD_ICONS = [
  "raven-hill",
  "morbent-fel",
  "morladim",
  "archeus",
  "abercrombie",
  "stitches",
  "twilight-grove",
  "rolands-doom",
  "stalvan",
  "lupos",
  "nefaru",
];

/* ---- the world: five rooms in the hand, the rest counted */

const HAND = ["stormwind-city", "stranglethorn-vale", "winterspring", "zul-gurub", "orgrimmar"];
const HAND_NAME: Record<string, string> = {
  "stormwind-city": "Stormwind",
  "stranglethorn-vale": "Stranglethorn Vale",
  winterspring: "Winterspring",
  "zul-gurub": "Zul\u2019Gurub",
  orgrimmar: "Orgrimmar",
};

/* ---- what a growth team ships by default, refused line by line */

const REFUSALS = [
  ["No notifications.", "Tari never rings mid-dungeon."],
  ["No streaks.", "A week off costs nothing."],
  ["No infinite scroll.", "The page ends."],
  ["No leaderboards.", "Nobody wins Tari."],
  ["No points, no followers.", "Nothing here only goes up."],
  ["No arrows, no timers.", "A pin says look, never go."],
];

export default async function Page() {
  const items = await sheetItems();

  return (
    <main className={styles.page}>
      {/* ================= the hero */}
      <section className={styles.hero} aria-labelledby="hero-h">
        <HeroScene
          className={styles.scene}
          imageClassName={styles.room}
          figureClassName={styles.figure}
          effectClassName={styles.effect}
          shadowClassName={styles.figureShadow}
          src="/RLextras/Hillsbrad Hero.png"
          width={5504}
          height={3072}
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

      {/* ================= presence: the room, as the app draws it */}
      <section className={styles.section} data-tone="blue" aria-labelledby="room-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>Live rooms</p>
          <h2 id="room-h" className={styles.h2}>
            Walk in. <em>See who's there.</em>
          </h2>
          <p className={styles.body}>The list is live, across every realm. Quiet rooms point you next door.</p>
        </Reveal>
        <Reveal className={`${styles.photoCard} ${styles.appWindow}`}>
          <img src={roomArt("undercity")} alt="" loading="lazy" className={styles.photoArt} />
          <div className={styles.roomScrim} aria-hidden="true" />

          <div className={styles.roomTitle}>
            <p className={styles.roomKicker}>City · Eastern Kingdoms</p>
            <p className={styles.roomName}>Undercity</p>
          </div>

          <div className={`${styles.glassCard} ${styles.who}`}>
            <p className={styles.whoHead}>In the room</p>
            <p className={styles.whoCount}>5 here</p>
            {HERE.map(([who, what]) => (
              <p key={who} className={styles.whoRow}>
                <span>{who}</span>
                <span className={styles.whoMeta}>{what}</span>
              </p>
            ))}
            <p className={styles.whoRow}>
              <span className={styles.whoYou}>Nelfy</span>
              <span className={styles.whoMeta}>You</span>
            </p>
            <p className={styles.whoHeadNext}>Outside, in Tirisfal Glades</p>
            <p className={styles.whoRow}>
              <span>Tirisfal Glades</span>
              <span className={styles.whoMeta}>4</span>
            </p>
          </div>

          <p className={styles.chatHint}>⏎ to talk</p>
        </Reveal>
        <p className={styles.caption}>Real room. Invented names.</p>
      </section>

      {/* ================= the sheet: /you, as the app draws it */}
      <section className={styles.section} data-tone="gold" aria-labelledby="you-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>Your character</p>
          <h2 id="you-h" className={styles.h2}>
            Paste one line. <em>That's you.</em>
          </h2>
          <p className={styles.body}>
            Type <code className={styles.code}>/tari</code> in game. Your character steps out, gear and all. Hover
            anything for the real tooltip.
          </p>
        </Reveal>

        <Reveal className={`${styles.photoCard} ${styles.appWindow} ${styles.sheetCard}`}>
          <img src={roomArt("elwynn-forest")} alt="" loading="lazy" className={styles.photoArt} />
          <div className={styles.sheetScrim} aria-hidden="true" />
          <div className={styles.sheetGrid}>
            <ul className={`${styles.gearColumn} ${styles.gearLeft}`} role="list">
              {SHEET_L.map(([label, entry], i) => (
                <li key={`${label}-${i}`}>
                  <Slot label={label} item={entry ? items.get(entry) : undefined} />
                </li>
              ))}
            </ul>
            <SheetFigure
              className={styles.sheetStage}
              figureClassName={styles.figure}
              shadowClassName={styles.figureShadow}
            />
            <ul className={`${styles.gearColumn} ${styles.gearRight}`} role="list">
              {SHEET_R.map(([label, entry], i) => (
                <li key={`${label}-${i}`}>
                  <Slot label={label} item={entry ? items.get(entry) : undefined} align="right" />
                </li>
              ))}
            </ul>
            <ul className={styles.gearWeapons} role="list">
              {SHEET_W.map(([label, entry]) => (
                <li key={label}>
                  <Slot label={label} item={entry ? items.get(entry) : undefined} />
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <p className={styles.caption}>Live 3D from the 1.12 client. Yours stands at /you. Armory import works too.</p>
      </section>

      {/* ================= the guide: the deck and the pins, dealt in the room */}
      <section className={styles.section} data-tone="purple" aria-labelledby="guide-h">
        <Reveal className={styles.copy}>
          <p className={styles.badge}>The deck</p>
          <h2 id="guide-h" className={styles.h2}>
            Lore you can <em>pick up.</em>
          </h2>
          <p className={styles.body}>
            Chips, graves, yells, and pins left where players stood. No wiki walls. Duskwood and Undercity are dealt.
          </p>
        </Reveal>

        <Reveal className={`${styles.photoCard} ${styles.appWindow} ${styles.deckWindow}`}>
          <img src={roomArt("duskwood")} alt="" loading="lazy" className={styles.photoArt} />
          <div className={styles.roomScrim} aria-hidden="true" />

          <div className={styles.roomTitle}>
            <p className={styles.roomKicker}>Zone · Eastern Kingdoms</p>
            <p className={styles.roomName}>Duskwood</p>
          </div>

          <div className={`${styles.glassCard} ${styles.storyCard}`}>
            <div className={styles.storyTop}>
              <span className={styles.storyIcon} aria-hidden="true">
                <img src="/story/duskwood/stitches.png" alt="" width={40} height={40} loading="lazy" />
              </span>
              <div className={styles.storyWho}>
                <p className={styles.storyKicker}>The story here</p>
                <p className={styles.storySubject}>Stitches</p>
                <p className={styles.storyTag}>Level 35 Elite · walks the road</p>
              </div>
            </div>
            <p className={styles.storyYellWho}>Stitches yells</p>
            <p className={styles.storyYell}>
              DARKSHIRE... I HUNGER.<span className={styles.yellCaret} aria-hidden="true" />
            </p>
            <p className={styles.storyLine}>Two Night Watch stands are in his way. Without help, he kills both.</p>
            <p className={styles.storyLink}>Open the map here</p>
          </div>

          <div className={styles.pinDemo}>
            <span className={styles.pinMark} aria-hidden="true" />
            <span className={styles.pinCard}>
              <span className={styles.pinText}>Stop on the bridge at dusk and look east. Nobody does.</span>
              <span className={styles.pinMeta}>Marrow · at 24 · Firemaw</span>
            </span>
          </div>

          <div className={styles.deckFoot}>
            <p className={styles.deckPager}>
              <span>Raven Hill</span>
              <span className={styles.deckCount}>6 of 11</span>
              <span>Twilight Grove →</span>
            </p>
            <div className={styles.deckStrip} aria-hidden="true">
              {DUSKWOOD_ICONS.map((n) => (
                <img
                  key={n}
                  src={`/story/duskwood/${n}.png`}
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  data-on={n === "stitches" || undefined}
                />
              ))}
            </div>
          </div>
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
            Stuff we <em>won't</em> build.
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
