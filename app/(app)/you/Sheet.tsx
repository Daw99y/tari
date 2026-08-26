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
 * still says the import is missing; that is a different fact. */

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
  SHEET_SLOTS,
  START_ROOM,
  TRADE_CAP,
  trades,
  type Character,
} from "@/lib/character";
import UpArrow from "@/components/UpArrow";
import { QUALITY } from "@/lib/doll";
import { isOn, useMarks } from "@/lib/marks";
import { letter, readPath, type BehindSlot } from "@/lib/path";
import { getRoom, roomArt } from "@/lib/rooms";
import { DEFAULT_LOOK, useBody } from "@/lib/use-body";
import { handedFor, itemsByEntry, WARDROBE, type Item as WardrobeItem } from "@/lib/wardrobe";
import type { WornItem } from "@/lib/worn";

import styles from "./sheet.module.css";

const NO_GEAR = new Map<string, WardrobeItem>();
const NO_PATH: BehindSlot[] = [];

export default function Sheet() {
  const [me, setMe] = useState<Character | null | undefined>(undefined);
  useEffect(() => setMe(loadCharacter()), []);

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
    /* Only the slots the sheet draws get worn, so the ranged weapon the sheet
     * leaves out is not hung off a hand the character is already using. */
    const worn = new Map<string, WardrobeItem>();
    for (const slot of SHEET_SLOTS) {
      const id = me.gear[slot - 1] ?? 0;
      const item = id ? byEntry.get(id) : undefined;
      if (!item) continue;
      const handed = handedFor(slot, item);
      worn.set(handed.slot, handed);
    }
    setEquipped(worn);
  }, [me, byEntry]);

  /* What the dictionary says about what is worn — the plate's own fields for
   * the 19 ids, one fetch. The wardrobe knows the models; only this knows
   * the levels, and the path is a question about levels. */
  const [dict, setDict] = useState<Record<string, WornItem> | null>(null);
  useEffect(() => {
    if (!me) return;
    const ids = [...new Set(me.gear.filter((id) => id > 0))];
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
  }, [me]);

  const marks = useMarks();
  const path = useMemo(
    () => (me ? readPath(me.gear, dict, me.cls, me.level, (itemId) => isOn(marks, me.key, "found", String(itemId))) : NO_PATH),
    [me, dict, marks]
  );
  const behind = useMemo(() => new Map(path.map((s) => [s.at, s])), [path]);
  const lines = useMemo(() => letter(path), [path]);

  /* One slot's rooms at a time. Escape and a press anywhere else put it away. */
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
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
  const slot = (id: number) => {
    const itemId = me.gear[id - 1] ?? 0;
    return {
      id,
      label: GEAR_SLOTS[id - 1],
      item: itemId ? byEntry.get(itemId) ?? null : null,
      itemId,
      behind: behind.get(id - 1)?.rooms.length ? behind.get(id - 1)! : null,
      open: open === id - 1,
      onOpen: () => setOpen((was) => (was === id - 1 ? null : id - 1)),
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
          {lines.length ? (
            <div className={styles.letter}>
              {lines.map((l) => (
                <p key={l} className={styles.letterLine}>
                  {l}
                </p>
              ))}
            </div>
          ) : null}
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
  label,
  item,
  itemId,
  align,
  behind,
  open,
  onOpen,
}: {
  label: string;
  item: WardrobeItem | null;
  itemId: number;
  align?: "right";
  behind: BehindSlot | null;
  open: boolean;
  onOpen: () => void;
}) {
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  /* The list dissolves at the bottom while there is more of it, the way the
     chat's scrollback does — no scrollbar, and no fade once you are at the
     end of a list that never needed one. */
  const list = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = list.current;
    if (!open || !el) {
      setMore(false);
      return;
    }
    const check = () => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [open]);

  return (
    <li className={styles.slot} data-align={align} data-empty={!item || undefined} data-behind={behind ? "" : undefined}>
      <span className={styles.icon} aria-hidden="true">
        {item?.icon ? <img src={`${WARDROBE}/icons/${item.icon}`} alt="" width={40} height={40} draggable={false} /> : null}
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

      {behind ? (
        <>
          <button
            type="button"
            className={styles.press}
            aria-expanded={open}
            aria-label={`${label}: an upgrade waits in ${behind.rooms.length} ${
              behind.rooms.length === 1 ? "room" : "rooms"
            }`}
            onPointerDown={stop}
            onClick={onOpen}
          />
          <UpArrow className={styles.mark} />
          {open ? (
            <div className={styles.rooms} onPointerDown={stop}>
              <p className={styles.roomsHead}>{behind.empty ? "Fills in" : "Better in"}</p>
              <ul ref={list} className={styles.roomsList} data-more={more ? "" : undefined}>
                {behind.rooms.map((id) => (
                  <li key={id}>
                    <Link href={`/r/${id}`} className={styles.roomLink}>
                      {getRoom(id)?.name ?? id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
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
