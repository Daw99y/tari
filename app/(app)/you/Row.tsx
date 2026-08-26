"use client";

/* ONE ROW, IN BOTH PANELS. docs/DRESSING.md.
 *
 * The drawer lists what you could wear; the arrow lists what the world is
 * holding for you. They are two questions about the same object, so they are
 * one row — and it has the room's kit row's own shape, because a reader who
 * has starred an item in Duskwood should meet the same row on their sheet.
 *
 * FOUR TARGETS, ONE MEANING EACH. The picture is the item. The name is a
 * door to its card, in the room the world actually keeps it in — inert when
 * nothing in your window drops it, because a door with no room behind it is
 * the app pointing at nothing (the arrow's own rule, DROPS.md step 6). The
 * star is the wish mark, the same one the kit writes. The slot's silhouette
 * puts it on.
 *
 * AND THE PLATE, WHICH IS THE FIFTH THING AND NOT A TARGET. Hovering the
 * picture or the name asks for the game's own tooltip, the way it does
 * everywhere else in the app — a reader choosing between two cloaks is
 * choosing on numbers, and the numbers live on the plate. It is asked for
 * `quiet` (lib/plate-item.ts): the game's half only, because the sheet holds
 * the dictionary and not the world.
 */

import Link from "next/link";

import { ItemHover } from "@/components/ItemTooltip";
import SlotGlyph from "@/components/SlotGlyph";
import WishStar from "@/components/WishStar";
import { QUALITY } from "@/lib/doll";
import { plateItem, type RowItem } from "@/lib/plate-item";
import type { WornItem } from "@/lib/worn";

import styles from "./sheet.module.css";

export default function Row({
  item,
  plate,
  level,
  label,
  room,
  on,
  wished,
  onWish,
  onEquip,
}: {
  item: RowItem;
  /** The dictionary row, for the plate. Absent until the fetch lands, and the
   *  row reads fine without it. */
  plate: WornItem | undefined;
  /** The reader's level, so the plate can redden a requirement they have not
   *  met — the same argument it makes in a room. */
  level: number;
  /** The gear slot's own name, for the glyph and for what the buttons say. */
  label: string;
  /** The first room in the rail's order that offers it, or null. */
  room: string | null;
  /** This is what is in the slot right now. */
  on: boolean;
  wished: boolean;
  onWish: () => void;
  onEquip: () => void;
}) {
  const name = (
    <span className={styles.wearName} style={{ color: QUALITY[item.quality] }}>
      {item.name}
    </span>
  );

  const icon = item.icon ? (
    <img src={item.icon} alt="" width={22} height={22} loading="lazy" draggable={false} />
  ) : null;

  const door = room ? (
    <Link href={`/r/${room}?item=${item.entry}`} className={styles.wearDoor}>
      {name}
    </Link>
  ) : (
    <span className={styles.wearDoor} data-shut="">
      {name}
    </span>
  );

  const card = plate ? plateItem(item.entry, plate) : null;

  return (
    <li className={styles.wear} data-on={on || undefined}>
      {card ? (
        <ItemHover item={card} level={level} quiet focusable={false} className={styles.wearIcon}>
          {icon}
        </ItemHover>
      ) : (
        <span className={styles.wearIcon} aria-hidden="true">
          {icon}
        </span>
      )}

      {card ? (
        <ItemHover item={card} level={level} quiet inLink={!!room} tap className={styles.wearHover}>
          {door}
        </ItemHover>
      ) : (
        door
      )}

      {item.itemLevel ? <span className={styles.wearLevel}>{item.itemLevel}</span> : null}

      <button
        type="button"
        className={styles.wish}
        aria-pressed={wished}
        aria-label={wished ? `${item.name}: stop hunting` : `${item.name}: hunt this`}
        onClick={onWish}
      >
        <WishStar on={wished} />
      </button>

      <button
        type="button"
        className={styles.put}
        aria-pressed={on}
        aria-label={on ? `${item.name}: worn on your ${label.toLowerCase()}` : `Wear ${item.name}`}
        onClick={onEquip}
      >
        <SlotGlyph slot={label} />
      </button>
    </li>
  );
}
