/* THE SHEET, STILL. /you's paperdoll drawn with sheet.module.css — the name
 * over the doll, the nineteen slots in the game's order, the summons arrows
 * on the slots the level has left behind, and the trades in the corner. The
 * gear is real 1.12 items with the real tooltip on hover; the character is
 * invented and the captions say so. */

import { promises as fs } from "node:fs";
import path from "node:path";

import Coins from "@/components/Coins";
import { ItemHover } from "@/components/ItemTooltip";
import SlotGlyph from "@/components/SlotGlyph";
import UpArrow from "@/components/UpArrow";
import { classIcon, racePortrait, START_ROOM } from "@/lib/character";
import { CLASS_COLOR } from "@/lib/class-color";
import { QUALITY } from "@/lib/doll";
import { iconUrl, type Item, type Quality } from "@/lib/loot";
import { plateItem } from "@/lib/plate-item";
import { roomArt } from "@/lib/rooms";
import type { WornItem } from "@/lib/worn";

import SheetFigure from "../SheetFigure";
import { ME } from "./Window";
import mock from "./mock.module.css";
import styles from "../../(app)/you/sheet.module.css";

/* ---- the gear: the game's 19 slots in the game's order (lib/character.ts
 * SHEET_LEFT / SHEET_RIGHT / SHEET_BOTTOM). The entries are the outfit the
 * figure wears (components/SeducedFigure.tsx) plus the slots the client
 * wears but does not draw. The number beside a slot is the summons: how many
 * upgrades the rooms in her window are holding for it. */

type SheetSlot = [label: string, entry: number | null, behind?: number];

const SHEET_L: SheetSlot[] = [
  ["Head", 3020],
  ["Neck", 19541],
  ["Shoulder", 2264],
  ["Back", 13108, 3],
  ["Chest", 4119, 5],
  ["Shirt", 4336],
  ["Tabard", 19506],
  ["Wrist", 9455, 1],
];
const SHEET_R: SheetSlot[] = [
  ["Hands", 6727, 7],
  ["Waist", 20117, 2],
  ["Legs", 9624, 11],
  ["Feet", 20114, 2],
  ["Finger", 13097, 2],
  ["Finger", 9447],
  ["Trinket", 21119],
  ["Trinket", 4381],
];
/* The dictionary speaks quality names; the doll's palette is indexed the
 * client's way. Poor 0 … Legendary 5, exactly lib/doll's QUALITY order. */
const QUALITY_RANK: Record<Quality, number> = { Poor: 0, Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5 };

const SHEET_W: SheetSlot[] = [
  ["Main hand", 13033, 12],
  ["Off hand", 776],
  ["Ranged", 6696, 6],
];

/* A handful of dictionary rows carry no icon name — the wardrobe catalogue
 * knows them, because the doll needs their art anyway. */
type Catalogue = { items: [number, number, ...unknown[]][]; display: Record<string, { i?: number }>; pool: string[] };

async function catalogueIcons(entries: number[]): Promise<Map<number, string>> {
  const file = path.join(process.cwd(), "public", "lab", "doll", "items", "catalogue.json");
  const cat = JSON.parse(await fs.readFile(file, "utf8")) as Catalogue;
  const out = new Map<number, string>();
  for (const entry of entries) {
    const row = cat.items.find((r) => r[0] === entry);
    const icon = row ? cat.display[row[1]]?.i : undefined;
    const stem = icon ? cat.pool[icon] : undefined;
    if (stem) out.set(entry, stem.replace(/^icons_/, "").replace(/\.webp$/, ""));
  }
  return out;
}

async function sheetItems(): Promise<Map<number, Item>> {
  const raw = await fs.readFile(path.join(process.cwd(), "reference", "items.json"), "utf8");
  const dict = JSON.parse(raw) as Record<string, WornItem>;
  const worn = [...SHEET_L, ...SHEET_R, ...SHEET_W].flatMap(([, entry]) => (entry ? [entry] : []));
  const spares = await catalogueIcons(worn.filter((e) => !dict[String(e)]?.i));
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

/* One slot card, Sheet.tsx's Slot at rest: icon, label, name in its quality
 * colour, the summons beside it, and the real plate on hover. */
function Slot({
  label,
  item,
  behind,
  align,
}: {
  label: string;
  item?: Item;
  behind?: number;
  align?: "right";
}) {
  const body = (
    <>
      <span className={styles.icon} aria-hidden="true">
        {item && iconUrl(item) ? (
          <img src={iconUrl(item)!} alt="" width={40} height={40} loading="lazy" decoding="async" draggable={false} />
        ) : (
          <SlotGlyph slot={label} className={styles.slotGlyph} />
        )}
      </span>
      <span className={styles.slotText}>
        <span className={styles.slotLabel}>{label}</span>
        {item ? (
          <span className={styles.slotItem} style={{ color: QUALITY[QUALITY_RANK[item.quality]] }}>
            {item.name}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <li
      className={styles.slot}
      data-align={align}
      data-empty={!item || undefined}
      data-behind={behind ? "" : undefined}
    >
      {body}
      {item ? (
        <ItemHover item={item} level={ME.level} quiet focusable={false} className={styles.pressHover}>
          <span className={styles.press} />
        </ItemHover>
      ) : null}
      {behind ? (
        <span className={styles.summons}>
          <UpArrow className={styles.summonsMark} />
          <span className={styles.summonsCount}>{behind}</span>
        </span>
      ) : null}
    </li>
  );
}

function Trade({ name, rank }: { name: string; rank: number }) {
  return (
    <li className={styles.trade}>
      <span className={styles.tradeRow}>
        <span className={styles.factKey}>{name}</span>
        <span className={styles.factVal}>
          {rank}
          <span className={styles.cap}> / 300</span>
        </span>
      </span>
      <span className={styles.tradeBar} aria-hidden="true">
        <span className={styles.tradeFill} style={{ width: `${(rank / 300) * 100}%` }} />
      </span>
    </li>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <p className={styles.fact}>
      <span className={styles.factKey}>{k}</span>
      <span className={styles.factVal}>{v}</span>
    </p>
  );
}

export default async function SheetStage() {
  const items = await sheetItems();
  const slot = ([label, entry, behind]: SheetSlot, i: number, align?: "right") => (
    <Slot key={`${label}-${i}`} label={label} item={entry ? items.get(entry) : undefined} behind={behind} align={align} />
  );

  return (
    <div className={styles.sheet}>
      <img className={styles.art} src={roomArt(START_ROOM[ME.race] ?? "elwynn-forest")} alt="" />
      <div className={styles.scrim} />

      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.who}>
            <p className={styles.line}>
              Level {ME.level} Human Rogue
              <span className={styles.realm}> · {ME.realm}</span>
            </p>
            <span className={styles.whoPress} style={{ ["--cls" as string]: CLASS_COLOR[ME.cls] }}>
              <span className={styles.whoFace} aria-hidden="true">
                <img src={racePortrait(ME.race, ME.sex)} alt="" decoding="async" draggable={false} />
                <img className={styles.whoClass} src={classIcon(ME.cls)} alt="" decoding="async" draggable={false} />
              </span>
              <h1 className={styles.name}>{ME.name}</h1>
              <span className={styles.whoCaret} aria-hidden="true">
                <svg viewBox="0 0 16 16" focusable="false">
                  <path
                    d="M3.5 6 8 10.5 12.5 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
          </div>
        </header>

        <ul className={`${styles.column} ${styles.left}`}>{SHEET_L.map((s, i) => slot(s, i))}</ul>

        <SheetFigure
          className={styles.doll}
          figureClassName={mock.figure}
          shadowClassName={mock.figureShadow}
        />

        <ul className={`${styles.column} ${styles.right}`}>{SHEET_R.map((s, i) => slot(s, i, "right"))}</ul>

        <ul className={styles.weapons}>{SHEET_W.map((s, i) => slot(s, i))}</ul>

        <aside className={styles.facts}>
          <Fact k="Played" v="2d 6h" />
          <Fact k="Money" v={<Coins copper={234108} />} />
          <Fact k="Hearth" v="Goldshire" />
          <ul className={styles.trades}>
            <Trade name="First Aid" rank={132} />
            <Trade name="Engineering" rank={96} />
          </ul>
        </aside>
      </div>
    </div>
  );
}
