"use client";

/* THE SHEET. The game's paperdoll, in Tari's register: the body in the
 * middle, the gear down both sides in the game's own order, the melee weapons
 * under it, and the facts the import carried in the corner. Nothing here
 * is invented: a slot with no import is empty, a panel with no fact is
 * not drawn, and the corner prints the trades rather than every skill line
 * the client reports (lib/character.ts, trades). docs/CHARACTER.md.
 *
 * AND THE PATH. docs/DROPS.md step 6: the letter's line under the name, and
 * the upgrade arrow on any slot the level has left behind — pressed, it names
 * the rooms that answer it, and those names are doors. That is the whole
 * cross-zone surface. There is no page of them, no ranking and no order to
 * walk them in; §2.1 allows a doorway back into places and nothing else.
 *
 * THE ARROW ONLY STANDS WHERE THERE IS AN ANSWER. It is the summons' own
 * green arrow (components/UpArrow.tsx), which means one thing everywhere in
 * the app — "better than what you have, here". A slot that is behind and
 * that no room in your window answers gets nothing, because an arrow that
 * opened an empty list would be the app pointing at a door with no room
 * behind it. The letter's first sentence still counts every behind slot,
 * which is why the arrows can be fewer than the number it says.
 *
 * IT DOES NOT WAIT FOR AN IMPORT. A made body wears nothing, and nothing is
 * behind everything — sixteen arrows is the honest answer to a naked level
 * 24, and the most useful first look at the world Tari can give. The corner
 * still says the import is missing; that is a different fact.
 *
 * AND THE DRESSING ROOM. docs/DRESSING.md: press a slot and a drawer opens
 * beside it with everything this class and level can wear, strongest first.
 * What you choose is an `equip` mark laid over the import — the import is
 * never written on, and taking the slot back gives it straight up again.
 *
 * WHAT IS SHOWN IS WHAT IS READ. The doll, the slots, the letter and the
 * arrows all run off `gear`, which is the plan over the import, because there
 * is one character and it wears what you told it to. The letter's third
 * sentence is what stops that being a lie: it counts how many of the slots it
 * just described are the reader's own doing. Each one also wears a ring.
 *
 * THE THIRD SLOT IS DRAWN AND NEVER WORN. Kacey, 2026-08-26: the ranged
 * socket is back on the sheet — a hunter's bow is the slot that matters most
 * to them and it was the one the paperdoll refused to show. It names itself
 * by class (a paladin carries a Relic, not a Ranged), it takes a drawer and a
 * summons like any other, and the figure does not hang it: three weapons and
 * two hands. lib/character.ts, WORN_SLOTS.
 *
 * PRESSING THE CARD OPENS THE DRAWER; PRESSING THE ARROW OPENS THE ROOMS.
 * The arrow was the whole card's press before the drawer existed and could
 * afford not to be a target. It is one now — a slot on a paperdoll means
 * "change this", and the arrow already means "there is better, here", so the
 * two presses say what they open. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CLASS_NAME,
  GEAR_SLOTS,
  loadCharacter,
  money,
  played,
  RACE_NAME,
  SHEET_BOTTOM,
  SHEET_LEFT,
  SHEET_RIGHT,
  START_ROOM,
  thirdSlot,
  TRADE_CAP,
  trades,
  type Character,
} from "@/lib/character";
import SlotGlyph from "@/components/SlotGlyph";
import UpArrow from "@/components/UpArrow";
import { QUALITY } from "@/lib/doll";
import type { ClassId } from "@/lib/loot";
import { isOn, setMark, useMarks } from "@/lib/marks";
import { letter, offeredIn, readPath, type BehindSlot } from "@/lib/path";
import { clearSlot, overlay, planKey, planSlot, plannedAt } from "@/lib/plan";
import { rowFromPlate, rowFromWardrobe, type RowItem } from "@/lib/plate-item";
import { getRoom, roomArt } from "@/lib/rooms";
import { DEFAULT_LOOK, useBody } from "@/lib/use-body";
import { heldGear, itemsByEntry, TWO_HANDED, type Item as WardrobeItem } from "@/lib/wardrobe";
import type { WornItem } from "@/lib/worn";

import Drawer from "./Drawer";
import Row from "./Row";
import styles from "./sheet.module.css";

const NO_GEAR = new Map<string, WardrobeItem>();
const NO_PATH: BehindSlot[] = [];
const NO_ITEMS: number[] = [];

export default function Sheet() {
  const [me, setMe] = useState<Character | null | undefined>(undefined);
  useEffect(() => setMe(loadCharacter()), []);

  const marks = useMarks();

  /* The plan over the import. Nothing below this line reads `me.gear`: the
     figure, the slots, the dictionary and the path all read `gear`.
   *
   * Held by the plan's own signature rather than by the marks store, because
   * the store is replaced on every commit anywhere in the app and `gear` is
   * what drives the dressing effect — see `planKey` in lib/plan.ts. */
  const key = planKey(marks, me?.key ?? null);
  const plan = useMemo(() => plannedAt(marks, me?.key ?? null), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const gear = useMemo(() => (me ? overlay(me.gear, plan) : NO_ITEMS), [me, plan]);

  const [equipped, setEquipped] = useState<Map<string, WardrobeItem>>(NO_GEAR);
  const { hostRef, catalogue, error } = useBody({
    race: me?.race ?? 1,
    gender: me?.sex ?? 0,
    look: me?.look ?? DEFAULT_LOOK,
    equipped,
  });

  /* The wardrobe by item id, so the 19 slots can find their rows. */
  const byEntry = useMemo(() => (catalogue ? itemsByEntry(catalogue) : new Map<number, WardrobeItem>()), [catalogue]);

  useEffect(() => {
    if (!me || byEntry.size === 0) return;
    setEquipped(heldGear(gear, byEntry));
  }, [me, gear, byEntry]);

  /* What the dictionary says about what is worn — the plate's own fields for
   * the 19 ids, one fetch. The wardrobe knows the models; only this knows
   * the levels, and the path is a question about levels. */
  const [dict, setDict] = useState<Record<string, WornItem> | null>(null);
  useEffect(() => {
    if (!me) return;
    const ids = [...new Set(gear.filter((id) => id > 0))];
    /* Nothing worn is not nothing to say: an empty answer lets the path run
       on sixteen empty slots rather than waiting forever for a fetch that
       has no ids to make. */
    if (ids.length === 0) {
      setDict({});
      return;
    }
    let gone = false;
    fetch(`/api/items?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, WornItem> | null) => {
        if (!gone && d) setDict(d);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [me, gear]);

  const path = useMemo(
    () => (me ? readPath(gear, dict, me.cls, me.level, (itemId) => isOn(marks, me.key, "found", String(itemId))) : NO_PATH),
    [me, gear, dict, marks]
  );
  const behind = useMemo(() => new Map(path.map((s) => [s.at, s])), [path]);

  /* Which room, if any, is holding each item right now — so a drawer row
     knows whether its name is a door. Same filter as the arrows. */
  const where = useMemo(() => (me ? offeredIn(me.cls, me.level) : new Map<number, string>()), [me]);
  const lines = useMemo(() => letter(path, plan.size), [path, plan]);

  /* One panel at a time, whichever kind. Escape and a press anywhere else put
     it away — the room's own contract for anything that opens over the art. */
  const [open, setOpen] = useState<{ at: number; kind: "rooms" | "drawer" } | null>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      setOpen(null);
    };
    window.addEventListener("keydown", away);
    window.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("keydown", away);
      window.removeEventListener("pointerdown", away);
    };
  }, [open]);

  if (me === undefined) return null;
  if (me === null) {
    return (
      <div className={styles.none}>
        <p className={styles.noneLine}>No one here yet.</p>
        <Link href="/you/new" className={styles.noneLink}>
          Make a character
        </Link>
      </div>
    );
  }

  const home = getRoom(START_ROOM[me.race] ?? "elwynn-forest");
  const worked = trades(me.professions);
  const main = byEntry.get(gear[15] ?? 0);
  const bothHands = main?.inventoryType === TWO_HANDED ? main : null;
  const show = (at: number, kind: "rooms" | "drawer") =>
    setOpen((was) => (was?.at === at && was.kind === kind ? null : { at, kind }));

  const slot = (id: number) => {
    const at = id - 1;
    const itemId = gear[at] ?? 0;
    /* Named from the catalogue where it has art and from the dictionary where
       it has not, so a relic on the third slot reads as itself rather than as
       its id. */
    const known = itemId ? byEntry.get(itemId) : undefined;
    const row = known
      ? rowFromWardrobe(known)
      : itemId && dict?.[itemId]
        ? rowFromPlate(itemId, dict[itemId])
        : null;
    return {
      at,
      label: at === 17 ? thirdSlot(me.cls) : GEAR_SLOTS[at],
      item: row,
      itemId,
      planned: plan.has(at),
      behind: behind.get(at)?.rooms.length ? behind.get(at)! : null,
      rooms: open?.at === at && open.kind === "rooms",
      drawer: open?.at === at && open.kind === "drawer",
      onRooms: () => show(at, "rooms"),
      onDrawer: () => show(at, "drawer"),
      /* The off hand under a two-hander is the weapon's own doing, not a gap
         — lib/path.ts refuses to accuse it and the drawer refuses to fill it. */
      blocked: at === 16 && bothHands ? `Both hands are on ${bothHands.name}.` : null,
      cls: me.cls,
      level: me.level,
      byEntry,
      where,
      wished: (itemId: number) => isOn(marks, me.key, "wish", String(itemId)),
      onWish: (itemId: number) => setMark(me.key, "wish", String(itemId), !isOn(marks, me.key, "wish", String(itemId))),
      onPick: (entry: number) => {
        planSlot(me.key, at, entry);
        setOpen(null);
      },
      onClear: () => {
        clearSlot(me.key, at);
        setOpen(null);
      },
    };
  };

  return (
    <div className={styles.sheet}>
      {home ? <img className={styles.art} src={roomArt(home.id)} alt="" /> : null}
      <div className={styles.scrim} />

      <div className={styles.page}>
        <header className={styles.head}>
          <p className={styles.line}>
            Level {me.level} {RACE_NAME[me.race]} {CLASS_NAME[me.cls]}
            {me.realm ? <span className={styles.realm}> · {me.realm}</span> : null}
            {me.guild ? <span className={styles.realm}> · &lt;{me.guild}&gt;</span> : null}
          </p>
          <h1 className={styles.name}>{me.name}</h1>
          {/* Always drawn, and tall enough for its longest self. The letter
              grows a line when something is planned and loses one when the
              plan closes a slot, and a header that changes height re-centres
              both gear columns under it — the sheet must not move because the
              reader put a hat on. */}
          <div className={styles.letter}>
            {lines.map((l) => (
              <p key={l} className={styles.letterLine}>
                {l}
              </p>
            ))}
          </div>
        </header>

        <ul className={`${styles.column} ${styles.left}`} aria-label="Worn, left">
          {SHEET_LEFT.map((id) => (
            <Slot key={id} {...slot(id)} />
          ))}
        </ul>

        <div ref={hostRef} className={styles.doll} />

        <ul className={`${styles.column} ${styles.right}`} aria-label="Worn, right">
          {SHEET_RIGHT.map((id) => (
            <Slot key={id} {...slot(id)} align="right" />
          ))}
        </ul>

        <ul className={styles.weapons} aria-label="Weapons">
          {SHEET_BOTTOM.map((id) => (
            <Slot key={id} {...slot(id)} />
          ))}
        </ul>

        <aside className={styles.facts} aria-label="Facts">
          {me.importedAt ? (
            <>
              {me.played != null ? <Fact k="Played" v={played(me.played)} /> : null}
              {me.copper != null ? <Fact k="Money" v={money(me.copper)} /> : null}
              {me.hearth ? <Fact k="Hearth" v={me.hearth} /> : null}
              {me.zone ? <Fact k="Last seen" v={me.zone} /> : null}
              {worked.length ? (
                <ul className={styles.trades}>
                  {worked.map((t) => (
                    <li key={t.name} className={styles.fact}>
                      <span className={styles.factKey}>{t.name}</span>
                      <span className={styles.factVal}>
                        {t.rank}
                        <span className={styles.cap}> / {TRADE_CAP}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className={styles.costume}>
              A body without an import. Paste what <span className={styles.mono}>/tari</span> gives you to fill this in.
            </p>
          )}
          <Link href="/you/new" className={styles.again}>
            Change
          </Link>
        </aside>

        {error ? <p className={styles.fault}>{error}</p> : null}
      </div>
    </div>
  );
}

function Slot({
  at,
  label,
  item,
  itemId,
  align,
  planned,
  behind,
  rooms,
  drawer,
  onRooms,
  onDrawer,
  blocked,
  cls,
  level,
  byEntry,
  where,
  wished,
  onWish,
  onPick,
  onClear,
}: {
  at: number;
  label: string;
  item: RowItem | null;
  itemId: number;
  align?: "right";
  planned: boolean;
  behind: BehindSlot | null;
  rooms: boolean;
  drawer: boolean;
  onRooms: () => void;
  onDrawer: () => void;
  blocked: string | null;
  cls: ClassId;
  level: number;
  byEntry: Map<number, WardrobeItem>;
  where: Map<number, string>;
  wished: (itemId: number) => boolean;
  onWish: (itemId: number) => void;
  onPick: (entry: number) => void;
  onClear: () => void;
}) {
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  /* A panel closing must not drop the reader out of a column of nineteen
     slots. The drawer takes focus when it opens (its field is the point of
     it), so when it goes the slot takes it back — but only if nothing else
     claimed it, which is what pressing elsewhere on the page means. */
  const press = useRef<HTMLButtonElement>(null);
  const held = useRef(false);
  useEffect(() => {
    const open = rooms || drawer;
    if (held.current && !open && document.activeElement === document.body) press.current?.focus();
    held.current = open;
  }, [rooms, drawer]);

  /* The plate's own fields for what the rooms are offering. One fetch, when
     the panel opens and not before — the sheet already asks this route for
     what is worn, and this is the same door with different ids. It is also
     the only name a relic has, so it is read before the rows are built. */
  const [plate, setPlate] = useState<Record<string, WornItem>>({});

  /* What the rooms are holding, as objects rather than place names — grouped
     under the room that has each, in the rail's order. A drop the wardrobe
     build has no art for cannot be drawn or worn and is left out; the panel
     says so rather than showing a shorter list and no reason. */
  const offers = useMemo(() => {
    if (!behind) return [];
    const by = new Map<string, RowItem[]>();
    for (const a of behind.answers) {
      const known = byEntry.get(a.itemId);
      /* The catalogue where it has art, the dictionary where it has not — a
         relic is real and undrawable, and the panel lists it either way. The
         dictionary arrives a beat later, which is why the row is added again
         when it lands rather than skipped for good. */
      const row = known ? rowFromWardrobe(known) : plate[a.itemId] ? rowFromPlate(a.itemId, plate[a.itemId]) : null;
      if (!row) continue;
      if (!by.has(a.room)) by.set(a.room, []);
      by.get(a.room)!.push(row);
    }
    return [...by].map(([room, items]) => ({ room, items }));
  }, [behind, byEntry, plate, at]);

  useEffect(() => {
    if (!rooms || !behind) return;
    const ids = behind.answers.map((a) => a.itemId);
    if (ids.length === 0) return;
    let gone = false;
    fetch(`/api/items?ids=${ids.slice(0, 100).join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, WornItem> | null) => {
        if (!gone && d) setPlate(d);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [rooms, behind]);

  /* The list dissolves at the bottom while there is more of it, the way the
     chat's scrollback does — no scrollbar, and no fade once you are at the
     end of a list that never needed one. */
  const list = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = list.current;
    if (!rooms || !el) {
      setMore(false);
      return;
    }
    const check = () => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [rooms]);

  return (
    <li
      className={styles.slot}
      data-align={align}
      data-empty={!item || undefined}
      data-behind={behind ? "" : undefined}
      data-planned={planned ? "" : undefined}
      data-idle={blocked ? "" : undefined}
    >
      {/* An empty slot draws its own silhouette, the way the landing page
          draws it and the way the item plate and the kit already do
          (components/SlotGlyph.tsx). Nineteen blank squares is a form; a
          shoulder, a boot and a ring is a paperdoll, and a reader can see
          what is missing without reading a single label. */}
      <span className={styles.icon} aria-hidden="true">
        {item?.icon ? (
          <img src={item.icon} alt="" width={40} height={40} draggable={false} />
        ) : (
          <SlotGlyph slot={label} className={styles.slotGlyph} />
        )}
      </span>
      <span className={styles.slotText}>
        <span className={styles.slotLabel}>{label}</span>
        {item ? (
          <span className={styles.slotItem} style={{ color: QUALITY[item.quality] }}>
            {item.name}
          </span>
        ) : itemId ? (
          <span className={styles.slotItem}>#{itemId}</span>
        ) : null}
      </span>

      {/* The card is the drawer's press. A slot on a paperdoll means
          "change this", and now there is something to change it to. */}
      <button
        ref={press}
        type="button"
        className={styles.press}
        aria-expanded={drawer}
        aria-label={planned ? `${label}: ${item?.name ?? "worn"}, chosen by you — change it` : `${label}: choose what to wear`}
        onPointerDown={stop}
        onClick={onDrawer}
      />

      {/* THE SUMMONS, OFF THE CARD. Kacey, 2026-08-26: it stands beside the
          slot as its own object now, and says how many. A mark inside the
          card could be quiet because it only meant "look here"; a thing that
          opens the room's gear is a control, and a control that says nothing
          about how much is behind it makes the reader press it to find out. */}
      {behind ? (
        <button
          type="button"
          className={styles.summons}
          aria-expanded={rooms}
          aria-label={`${label}: ${behind.answers.length} ${
            behind.answers.length === 1 ? "upgrade" : "upgrades"
          } in ${behind.rooms.length} ${behind.rooms.length === 1 ? "room" : "rooms"}`}
          onPointerDown={stop}
          onClick={onRooms}
        >
          <UpArrow className={styles.summonsMark} />
          <span className={styles.summonsCount} aria-hidden="true">
            {behind.answers.length}
          </span>
        </button>
      ) : null}

      {rooms && behind ? (
        <div className={styles.panel} onPointerDown={stop}>
          <p className={styles.roomsHead}>{behind.empty ? "Fills in" : "Better in"}</p>
          <ul ref={list} className={styles.list} data-more={more ? "" : undefined}>
            {offers.map((g) => (
              <li key={g.room} className={styles.group}>
                <Link href={`/r/${g.room}`} className={styles.roomLink}>
                  {getRoom(g.room)?.name ?? g.room}
                </Link>
                <ul className={styles.groupList}>
                  {g.items.map((item) => (
                    <Row
                      key={item.entry}
                      item={item}
                      plate={plate[item.entry]}
                      level={level}
                      label={label}
                      room={g.room}
                      on={item.entry === itemId}
                      wished={wished(item.entry)}
                      onWish={() => onWish(item.entry)}
                      onEquip={() => onPick(item.entry)}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {offers.length === 0 ? <p className={styles.drawerNote}>Nothing the wardrobe can draw yet.</p> : null}
        </div>
      ) : null}

      {drawer ? (
        blocked ? (
          <div className={styles.panel} onPointerDown={stop}>
            <p className={styles.roomsHead}>{label}</p>
            <p className={styles.drawerNote}>{blocked}</p>
          </div>
        ) : (
          <Drawer
            at={at}
            cls={cls}
            level={level}
            byEntry={byEntry}
            where={where}
            label={label}
            wearing={itemId}
            planned={planned}
            wished={wished}
            onWish={onWish}
            onPick={onPick}
            onClear={onClear}
          />
        )
      ) : null}
    </li>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <p className={styles.fact}>
      <span className={styles.factKey}>{k}</span>
      <span className={styles.factVal}>{v}</span>
    </p>
  );
}
