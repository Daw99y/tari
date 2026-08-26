"use client";

/* THE DRAWER. docs/DRESSING.md.
 *
 * Press a slot on the sheet and this opens beside it: everything this
 * character could put there, strongest first. Kacey's two rulings shape it —
 * *planning first*, so the top row is the best thing a level 24 rogue could
 * be wearing on their chest rather than the alphabetical first; and *what
 * your class and level can wear*, so a rogue never scrolls past nine hundred
 * plate chests to find one.
 *
 * THE FILTER IS THE SERVER'S. `app/api/wardrobe` holds the item dictionary
 * and lib/proficiency.ts holds the class table; both are far too heavy to
 * ship for a popover. This asks once when it opens, and again — debounced —
 * when the reader types. The search is the route's too, so a name is looked
 * for across the whole slot rather than across the two hundred rows that
 * came back.
 *
 * IT DRAWS FROM THE CATALOGUE THE PAGE ALREADY HAS. The route answers with
 * ids; the icon, the name, the quality and the look the doll needs all come
 * from `catalogue.json`, which the body hook has loaded anyway. An id the
 * catalogue has never heard of is an item the doll could not draw, so it is
 * dropped rather than listed and then failed.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import type { ClassId } from "@/lib/loot";
import type { WornItem } from "@/lib/worn";
import { rowFromPlate, rowFromWardrobe, type RowItem } from "@/lib/plate-item";
import { type Item as WardrobeItem } from "@/lib/wardrobe";

import Row from "./Row";
import styles from "./sheet.module.css";

/** A typed letter is worth one request, not one per keystroke. */
const TYPING = 200;

/** How many rows are drawn at once.
 *
 *  The route sends up to two hundred and the panel shows eleven. Every row
 *  carries two `ItemHover`s — the picture and the name — and two hundred of
 *  those is four hundred components with their own refs, effects and portal
 *  bookkeeping, laid out synchronously the moment a slot is pressed. The lab
 *  bench caps its picker for the same reason and says so: "a picker for the
 *  674 two-handers spends longer laying out than the scene does drawing."
 *  What is past the cap is counted in the note and reachable by name. */
const DRAWN = 60;

export default function Drawer({
  at,
  cls,
  level,
  byEntry,
  where,
  label,
  wearing,
  planned,
  wished,
  onWish,
  onPick,
  onClear,
}: {
  /** Gear index — GEAR_SLOTS' own numbering. */
  at: number;
  cls: ClassId;
  level: number;
  byEntry: Map<number, WardrobeItem>;
  /** itemId → the room holding it, for the rows that have a door. */
  where: Map<number, string>;
  /** The gear slot's own name. */
  label: string;
  /** What is in the slot now, imported or planned. */
  wearing: number;
  /** Whether what is in it is the reader's own doing. */
  planned: boolean;
  wished: (itemId: number) => boolean;
  onWish: (itemId: number) => void;
  onPick: (entry: number) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<RowItem[] | null>(null);
  /** The dictionary rows for what came back, for the plate on each. */
  const [plate, setPlate] = useState<Record<string, WornItem>>({});
  /** Everything this slot holds that is not on the screen — past the route's
   *  own cap and past this panel's. Counted rather than swallowed: a list
   *  that is quietly shorter than the truth is the one thing a drawer must
   *  not be. */
  const [past, setPast] = useState(0);

  useEffect(() => {
    if (byEntry.size === 0) return;
    let gone = false;
    const find = query.trim();
    const wait = setTimeout(() => {
      const url = `/api/wardrobe?at=${at}&cls=${cls}&level=${level}${find ? `&q=${encodeURIComponent(find)}` : ""}`;
      /* Always ask whether this is still the answer. The route's own header
         says a day, which is right for a CDN and wrong for a browser that
         will then not ask again after the dictionary or the class table
         moves under it — `loadCatalogue` takes the same posture, for the
         same reason. Revalidating costs one conditional request. */
      fetch(url, { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { ids: number[]; total: number; plate?: Record<string, WornItem> } | null) => {
          if (gone || !d) return;
          /* The catalogue first, because only its half can be hung on the
             figure; the dictionary where it has nothing, so a slot the client
             never draws — a relic — still lists what exists. */
          const dict = d.plate ?? {};
          const built: RowItem[] = [];
          for (const id of d.ids) {
            if (built.length === DRAWN) break;
            const known = byEntry.get(id);
            if (known) {
              if (!known.leftover) built.push(rowFromWardrobe(known));
              continue;
            }
            const row = dict[id];
            if (row) built.push(rowFromPlate(id, row));
          }
          setRows(built);
          setPlate(dict);
          setPast(Math.max(0, d.total - built.length));
        })
        .catch(() => {
          if (!gone) setRows([]);
        });
    }, find ? TYPING : 0);
    return () => {
      gone = true;
      clearTimeout(wait);
    };
  }, [at, cls, level, query, byEntry]);

  /* The list dissolves at the bottom while there is more of it — the rooms
     panel's manner, and the chat scrollback's before that. */
  const list = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const check = () => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [rows]);

  const empty = rows !== null && rows.length === 0;
  const note = useMemo(() => {
    if (empty) {
      return query.trim() ? "No such thing you can wear." : "Nothing in the game fits this slot for you yet.";
    }
    return past > 0 ? `${past.toLocaleString()} more. Search by name.` : null;
  }, [empty, past, query]);

  return (
    <div className={styles.panel} onPointerDown={(e) => e.stopPropagation()}>
      <div className={styles.drawerHead}>
        <span className={styles.roomsHead}>{label}</span>
        {planned ? (
          <button type="button" className={styles.takeOff} onClick={onClear}>
            Take off
          </button>
        ) : null}
      </div>

      <input
        className={styles.search}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search"
        aria-label={`Search ${label}`}
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />

      <ul ref={list} className={styles.list} data-more={more ? "" : undefined} aria-label={`${label}, what fits`}>
        {(rows ?? []).map((item) => (
          <Row
            key={item.entry}
            item={item}
            plate={plate[item.entry]}
            level={level}
            label={label}
            room={where.get(item.entry) ?? null}
            on={item.entry === wearing}
            wished={wished(item.entry)}
            onWish={() => onWish(item.entry)}
            onEquip={() => onPick(item.entry)}
          />
        ))}
      </ul>

      {note ? <p className={styles.drawerNote}>{note}</p> : null}
    </div>
  );
}
