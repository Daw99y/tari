"use client";

/* THE SHEET. The game's paperdoll, in Tari's register: the body in the
 * middle, the gear down both sides in the game's own order, the weapons
 * under it, and the facts the import carried in the corner. Nothing here
 * is invented: a slot with no import is empty, a panel with no fact is
 * not drawn. docs/CHARACTER.md. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  type Character,
} from "@/lib/character";
import { QUALITY } from "@/lib/doll";
import { getRoom, roomArt } from "@/lib/rooms";
import { DEFAULT_LOOK, useBody } from "@/lib/use-body";
import { itemsBySlot, WARDROBE, type Item as WardrobeItem } from "@/lib/wardrobe";

import styles from "./sheet.module.css";

const NO_GEAR = new Map<string, WardrobeItem>();

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
  const byEntry = useMemo(() => {
    const map = new Map<number, WardrobeItem>();
    if (catalogue) for (const rows of itemsBySlot(catalogue).values()) for (const item of rows) map.set(item.entry, item);
    return map;
  }, [catalogue]);

  useEffect(() => {
    if (!me || byEntry.size === 0) return;
    const worn = new Map<string, WardrobeItem>();
    for (const id of me.gear) {
      const item = id ? byEntry.get(id) : undefined;
      if (item) worn.set(item.slot, item);
    }
    setEquipped(worn);
  }, [me, byEntry]);

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
  const slot = (id: number) => {
    const itemId = me.gear[id - 1] ?? 0;
    return { id, label: GEAR_SLOTS[id - 1], item: itemId ? byEntry.get(itemId) ?? null : null, itemId };
  };

  return (
    <div className={styles.sheet}>
      {home ? <img className={styles.art} src={roomArt(home.id)} alt="" /> : null}
      <div className={styles.scrim} />

      <header className={styles.head}>
        <p className={styles.line}>
          Level {me.level} {RACE_NAME[me.race]} {CLASS_NAME[me.cls]}
          {me.realm ? <span className={styles.realm}> · {me.realm}</span> : null}
          {me.guild ? <span className={styles.realm}> · &lt;{me.guild}&gt;</span> : null}
        </p>
        <h1 className={styles.name}>{me.name}</h1>
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
            {me.professions?.map((p) => <Fact key={p.name} k={p.name} v={String(p.rank)} />)}
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
  );
}

function Slot({ label, item, itemId, align }: { label: string; item: WardrobeItem | null; itemId: number; align?: "right" }) {
  return (
    <li className={styles.slot} data-align={align} data-empty={!item || undefined}>
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
