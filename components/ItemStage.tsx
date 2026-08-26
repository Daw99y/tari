"use client";

/* THE ITEM, ON THE STAGE. docs/DROPS.md, "The stage is not the plate".
 *
 * components/ItemTooltip.tsx quotes what the game says about an item: its
 * black, its Arial, its pinned hues, and none of it leaving the plate. This
 * says what *Tari* knows, on Tari's own card in Tari's own face — where the
 * thing is, how often it gives, what it asks of you, and what you are
 * wearing instead. The division is by register, not by fact, and neither
 * surface is a smaller version of the other. So there are no stats here:
 * the plate has them, exactly, and repeating them in a second voice would
 * make the quotation an opinion.
 *
 * THE ROUTE'S FIRST NODE IS THE PLATE, cropped to the spot the thing
 * actually drops (DROPS.md step 5) — the one part of the stage whelp plz
 * structurally could not have. Pressing the crop borrows the real map,
 * centred there. Pressing the source's name turns the card over to the
 * source itself: where it stands, what it asks, and what else it holds for
 * you — a door, not a dead line of grey text.
 *
 * NOTHING IS A SCORE. The odds are type, not a ring: a 1.1% drop drawn as
 * an arc is an invisible sliver, and drawn as a *readable* arc it is a lie.
 * The number is the number, at the size the number deserves, with the kills
 * it comes to underneath it. */

import { useEffect, useState } from "react";

import { loadCharacter } from "@/lib/character";
import { spotOf, bestSource, type HuntSpot } from "@/lib/hunt";
import { iconUrl, type Item, type Source } from "@/lib/loot";
import { exclusiveFaction, oneSourceLine, riskWords } from "@/lib/tooltip";
import { FACTION_LABEL } from "@/lib/faction";
import { bindLine, itemLevelLine, requiredLevelLine, subclassLine } from "@/lib/tooltip";
import type { ZonePlate } from "@/lib/plate";
import { deltaParts, gearIndices, type WornItem } from "@/lib/worn";

import Crop from "./Crop";
import { ItemHover } from "./ItemTooltip";
import SlotGlyph from "./SlotGlyph";
import styles from "./item-stage.module.css";

/** The panel's own rounding: a whole number where the number is big enough
 *  to be one, a single decimal where dropping it would round 1.1% to 1%. */
function pct(rate: number): string {
  return rate >= 10 ? `${Math.round(rate)}%` : `${rate.toFixed(1)}%`;
}

/** What the character wears where this item would go. Two of a slot (rings,
 *  trinkets, hands) compare against the weaker one — the honest bar. */
function wornIds(item: Item): number[] {
  const gear = loadCharacter()?.gear;
  if (!gear?.length) return [];
  return gearIndices(item.slot)
    .map((i) => gear[i])
    .filter((id): id is number => typeof id === "number" && id > 0);
}

export default function ItemStage({
  item,
  level,
  room,
  plate,
  hunt,
  drops,
  onClose,
  onMap,
  onItem,
}: {
  item: Item;
  level: number;
  room: string;
  plate: ZonePlate | undefined;
  hunt: HuntSpot[];
  drops: Item[];
  onClose: () => void;
  /** Borrow the real map, centred on a spot. */
  onMap: (at: { x: number; y: number }) => void;
  /** Put a different item on the stage. */
  onItem: (item: Item) => void;
}) {
  /* The card's second face: a source, opened. Pressing the creature or the
     quest turns the card over; the item is one press back. */
  const [source, setSource] = useState<Source | null>(null);
  useEffect(() => setSource(null), [item.itemId]);

  const best = bestSource(item);
  const quest = best?.type === "quest";
  const rate = best && typeof best.dropChance === "number" && best.dropChance > 0 ? best.dropChance : null;
  const kills = rate ? Math.round(100 / rate) : null;
  const lock = exclusiveFaction(item);
  const icon = iconUrl(item);
  const spot = best ? spotOf(hunt, best) : undefined;

  /* The source's facts, on the node itself — the flip is for its camps and
     its holdings, not for its level. */
  const facts: string[] = [];
  if (best && !quest) {
    if (best.sourceLevel)
      facts.push(
        best.sourceLevel.min === best.sourceLevel.max
          ? `level ${best.sourceLevel.min}`
          : `level ${best.sourceLevel.min}–${best.sourceLevel.max}`
      );
    facts.push(...riskWords(best));
    if (best.instanceName) facts.push(`in ${best.instanceName}`);
    else if (spot && spot.p.length > 1) facts.push(`${spot.p.length} spots recorded`);
  }
  if (best && quest) {
    if (best.questLevel) facts.push(`a level ${best.questLevel} quest`);
    if (best.minLevel) facts.push(`opens at ${best.minLevel}`);
    if (spot) facts.push(`starts with ${spot.name}`);
  }

  /* Worn → this: one plain line of stat deltas (DROPS.md step 3). Read from
     the character on this machine, priced by the dictionary on the server. */
  const [worn, setWorn] = useState<WornItem | null>(null);
  const [bare, setBare] = useState(false);
  useEffect(() => {
    setWorn(null);
    setBare(false);
    const ids = wornIds(item);
    if (!loadCharacter()) return;
    if (ids.length === 0) {
      setBare(true);
      return;
    }
    let gone = false;
    fetch(`/api/items?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((dict: Record<string, WornItem> | null) => {
        if (gone || !dict) return;
        const rows = ids.map((id) => dict[id]).filter(Boolean);
        if (rows.length === 0) return setBare(true);
        rows.sort((a, b) => (a.il ?? 0) - (b.il ?? 0));
        setWorn(rows[0]);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [item]);

  /* The first source is the route's second node; listing it again under
     "also from" would be the card naming one creature twice. Each of the
     rest is a door to its own face, not a dead line. */
  const also = [...item.sources]
    .sort((a, b) => (b.dropChance ?? 100) - (a.dropChance ?? 100))
    .slice(1);

  const away = item.requiredLevel > level ? item.requiredLevel - level : 0;
  const game = [itemLevelLine(item), bindLine(item), requiredLevelLine(item)].filter(Boolean);

  if (source) {
    return (
      <SourceFace
        source={source}
        item={item}
        drops={drops}
        level={level}
        hunt={hunt}
        plate={plate}
        onBack={() => setSource(null)}
        onMap={onMap}
        onItem={onItem}
        onClose={onClose}
      />
    );
  }

  return (
    <div className={styles.stage}>
      <header className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          {icon ? <img src={icon} alt="" draggable={false} /> : <SlotGlyph slot={item.slot} className={styles.glyph} />}
        </span>

        <div className={styles.said}>
          <p className={styles.eyebrow}>
            {[item.quality, item.slot, subclassLine(item)].filter(Boolean).join("  ·  ")}
          </p>
          <h2 className={styles.name} data-quality={item.quality}>
            {item.name}
          </h2>
          {game.length > 0 ? <p className={styles.game}>{game.join("  ·  ")}</p> : null}
        </div>

        <button type="button" className={styles.close} onClick={onClose}>
          Close
          <span className={styles.esc} aria-hidden="true">esc</span>
        </button>
      </header>

      <div className={styles.body}>
        {/* The route. Three nodes and a hairline, no arrow between them —
            §13 refuses the arrow, and a route that only ever has one shape
            does not need one to be read. */}
        <ol className={styles.route}>
          <li className={styles.node}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.nodeK}>Here</span>
            <span className={styles.nodeV}>{room}</span>
            {plate && spot ? (
              <button
                type="button"
                className={styles.cropDoor}
                aria-label="See it on the map"
                onClick={() => onMap({ x: spot.x, y: spot.y })}
              >
                <Crop plate={plate} x={spot.x} y={spot.y} p={spot.p} zoom={3.6} className={styles.crop} />
                <span className={styles.cropWord}>See it on the map</span>
              </button>
            ) : null}
          </li>
          <li className={styles.node}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.nodeK}>{quest ? "Quest" : "Drop"}</span>
            {best ? (
              <button type="button" className={styles.srcDoor} onClick={() => setSource(best)}>
                {best.sourceName}
              </button>
            ) : (
              <span className={styles.nodeV}>Source unrecorded</span>
            )}
            {facts.length > 0 ? <span className={styles.nodeSub}>{facts.join("  ·  ")}</span> : null}
          </li>
          <li className={styles.node}>
            <span className={styles.dot} data-you aria-hidden="true" />
            <span className={styles.nodeK}>Yours</span>
            <span className={styles.nodeV}>
              {item.requiredLevel > 0 ? `at level ${item.requiredLevel}` : "at any level"}
            </span>
            {away > 0 ? (
              <span className={styles.nodeSub}>{away === 1 ? "one level away" : `${away} levels away`}</span>
            ) : null}
          </li>
        </ol>

        <div className={styles.aside}>
          {quest ? (
            <div className={styles.odds}>
              <p className={styles.fig}>Hand-in</p>
              <p className={styles.cap}>not a dice roll</p>
            </div>
          ) : rate ? (
            <div className={styles.odds}>
              <p className={styles.fig}>{pct(rate)}</p>
              <p className={styles.cap}>{kills === 1 ? "~1 kill" : `~${kills} kills`}</p>
            </div>
          ) : null}

          {lock ? <p className={styles.lock}>{FACTION_LABEL[lock]} only</p> : null}
        </div>

        {worn || bare ? (
          <section className={styles.worn}>
            <p className={styles.alsoHead}>Against what you wear</p>
            {worn ? <WornLine worn={worn} item={item} /> : (
              <p className={styles.wornLine}>Nothing in that slot yet — this fills it.</p>
            )}
          </section>
        ) : null}

        {also.length > 0 ? (
          <section className={styles.also}>
            <p className={styles.alsoHead}>Also from</p>
            <ul className={styles.alsoList}>
              {also.map((s, i) => (
                <li key={i}>
                  <button type="button" className={styles.alsoDoor} onClick={() => setSource(s)}>
                    {oneSourceLine(s, level)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/* Worn → this, in one line. The names carry their quality; the deltas are
 * plain ink — a gain is not a prize and a loss is not a warning. */
function WornLine({ worn, item }: { worn: WornItem; item: Item }) {
  const parts = deltaParts(worn, item);
  return (
    <p className={styles.wornLine}>
      <span className={styles.wornName} data-quality={worn.q}>
        {worn.n}
      </span>
      <span className={styles.wornArrow} aria-hidden="true">
        {" → "}
      </span>
      {parts.length > 0 ? parts.join("  ·  ") : "an even trade"}
    </p>
  );
}

/* THE CARD, TURNED OVER: the source itself. A creature at its camps, or a
 * quest and the one who starts it — and what else it holds for you here.
 * Everything on it is a way back into the room, never a task. */
function SourceFace({
  source,
  item,
  drops,
  level,
  hunt,
  plate,
  onBack,
  onMap,
  onItem,
  onClose,
}: {
  source: Source;
  item: Item;
  drops: Item[];
  level: number;
  hunt: HuntSpot[];
  plate: ZonePlate | undefined;
  onBack: () => void;
  onMap: (at: { x: number; y: number }) => void;
  onItem: (item: Item) => void;
  onClose: () => void;
}) {
  const quest = source.type === "quest";
  const spot = spotOf(hunt, source);
  const risk = riskWords(source);

  const lines: string[] = [];
  if (quest) {
    if (source.questLevel) lines.push(`a level ${source.questLevel} quest`);
    if (source.minLevel) lines.push(`opens at ${source.minLevel}`);
    if (source.faction && source.faction !== "both") lines.push(`${FACTION_LABEL[source.faction]} only`);
    if (spot) lines.push(`starts with ${spot.name}`);
  } else {
    if (source.sourceLevel)
      lines.push(
        source.sourceLevel.min === source.sourceLevel.max
          ? `level ${source.sourceLevel.min}`
          : `level ${source.sourceLevel.min}–${source.sourceLevel.max}`
      );
    if (risk.length) lines.push(...risk);
    if (source.instanceName) lines.push(`in ${source.instanceName}`);
    else if (spot && spot.p.length > 1) lines.push(`${spot.p.length} spots recorded`);
  }

  /* What else this source holds, of the room's own rows. */
  const holds = drops.filter(
    (d) => d.sources.some((s) => s.type === source.type && s.sourceId === source.sourceId)
  );

  return (
    <div className={styles.stage}>
      <header className={styles.head}>
        <div className={styles.said} style={{ gridColumn: "1 / span 2" }}>
          <p className={styles.eyebrow}>{quest ? "Quest" : "Drop source"}</p>
          <h2 className={styles.name}>{source.sourceName}</h2>
          <p className={styles.game}>{lines.join("  ·  ")}</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>
          Close
          <span className={styles.esc} aria-hidden="true">esc</span>
        </button>
      </header>

      <div className={styles.srcBody}>
        {plate && spot ? (
          <button
            type="button"
            className={styles.cropDoor}
            aria-label="See it on the map"
            onClick={() => onMap({ x: spot.x, y: spot.y })}
          >
            <Crop plate={plate} x={spot.x} y={spot.y} p={spot.p} zoom={quest ? 3.2 : 2.3} className={styles.srcCrop} />
            <span className={styles.cropWord}>See it on the map</span>
          </button>
        ) : null}

        {holds.length > 0 ? (
          <section className={styles.holds}>
            <p className={styles.alsoHead}>{quest ? "It pays, for you" : "It holds, for you"}</p>
            <ul className={styles.holdList}>
              {holds.map((d) => {
                const dIcon = iconUrl(d);
                return (
                  <li key={d.itemId}>
                    <button
                      type="button"
                      className={styles.holdRow}
                      onClick={() => (d.itemId === item.itemId ? onBack() : onItem(d))}
                    >
                      <ItemHover item={d} level={level} focusable={false} className={styles.holdIcon}>
                        {dIcon ? <img src={dIcon} alt="" loading="lazy" draggable={false} /> : null}
                      </ItemHover>
                      <span className={styles.holdName} data-quality={d.quality}>
                        {d.name}
                      </span>
                      {d.itemId === item.itemId ? <span className={styles.holdBack}>the one you opened</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <button type="button" className={styles.back} onClick={onBack}>
          ← {item.name}
        </button>
      </div>
    </div>
  );
}
