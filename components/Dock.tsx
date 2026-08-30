"use client";

/* THE DOCK. One mechanism, three subjects.
 *
 * docs/DROPS.md, "The stage": the middle of the photograph is not a fifth
 * place on the canvas — it is where a thing you opened stands, and only one
 * thing stands on it at a time. The subjects today: the map, an item, and
 * the kit — the room's answers laid against the reader's slots. One veil,
 * one Escape, one way to put a thing away.
 *
 * THE MAP IS LENT, NOT LOST. Whether the map stands open is the reader's
 * choice and it is remembered across rooms. So a subject opened over
 * another borrows the stage and gives it back: an item opened from the kit
 * returns to the kit; an item over an open map returns the map. One level
 * of memory, never a stack — a glance under a glance is still one glance.
 * Only closing a map the reader opened writes the preference, because only
 * that changed it. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import Compass from "@/components/Compass";
import ItemStage from "@/components/ItemStage";
import ZoneMap from "@/components/ZoneMap";
import type { HuntSpot } from "@/lib/hunt";
import type { Item } from "@/lib/loot";
import type { Pin } from "@/lib/pins";
import type { ZonePlate } from "@/lib/plate";

import styles from "./dock.module.css";

const KEY = "tari:map";

type Kind = "map" | "kit";
type Subject = { kind: Kind } | { kind: "item"; item: Item };

export type Dock = {
  openItem: (item: Item, from?: HTMLElement | null) => void;
  openKit: () => void;
  /** The stage's crop for anything with a spot: the real map, centred on
   *  it. The telling's cards use this the way the item stage does. */
  openMapAt: (at: { x: number; y: number }) => void;
  close: () => void;
};

const DockCtx = createContext<Dock | null>(null);

/** The dock's handles, for anything rendered inside it. */
export function useDock(): Dock | null {
  return useContext(DockCtx);
}

/**
 * A row that is a door. The loot row keeps its two hover targets — the plate
 * is a quotation and hovering is how the game asks for one — and gains a
 * press, which is the stage. Hover says what the item is; press says where
 * it is and what it costs. Neither is a smaller version of the other.
 *
 * The element it came from is handed along so focus can be given back when
 * the stage closes: a reader who opened this with the keyboard is returned
 * to the row they were on, not to the top of the room.
 */
export function Door({
  item,
  className,
  children,
}: {
  item: Item;
  className?: string;
  children: ReactNode;
}) {
  const dock = useContext(DockCtx);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      type="button"
      ref={ref}
      className={className}
      onClick={() => dock?.openItem(item, ref.current)}
    >
      {children}
    </button>
  );
}

export default function Dock({
  plate,
  hunt,
  drops,
  room,
  roomId,
  pins,
  level,
  kit,
  open,
  children,
}: {
  /** Absent for the twenty-nine rooms with no plate. The dock still stands:
   *  an item can be opened in a room that has no map. */
  plate: ZonePlate | undefined;
  /** Where the drawn rows' sources stand (lib/spots.ts). Empty where the
   *  dense layer has nothing. */
  hunt: HuntSpot[];
  /** The rows the room drew, for the stage's source face and the map. */
  drops: Item[];
  room: string;
  /** The id the wire and the pins table use (`duskwood`). */
  roomId: string;
  /** What people left on this room's map (docs/PINS.md). */
  pins: Pin[];
  level: number;
  /** The kit's face (app/(app)/r/[room]/Kit.tsx), handed in so the kit's
   *  contents stay beside the room that owns them. */
  kit?: ReactNode;
  /** An item the URL asked for (`?item=`), so a row on the sheet can be a
   *  door to its card rather than only to the room it stands in
   *  (docs/DRESSING.md). Only ever one of `drops` — the room shows eight
   *  things and this opens one of them, never a ninth. */
  open?: number;
  children: ReactNode;
}) {
  const [subject, setSubject] = useState<Subject | null>(null);
  // The glint runs only while the reader has never opened the map.
  const [fresh, setFresh] = useState(false);
  /* The last item the stage held. Kept after it closes so the fold-out has
     something to fold: dropping it on the first frame would empty the card
     and then animate the empty card away. */
  const [held, setHeld] = useState<Item | null>(null);
  /* Where a borrowed map should look first: the spot the stage handed over.
     Null is the map as the reader left it. */
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null);

  /** What an opened subject is standing on, to be given back when it closes.
   *  One level deep, on purpose. */
  const beneath = useRef<Kind | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const kitCard = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* The URL wins over the remembered map: a reader who followed a door to
       an item asked for the item, not for where they left the room. */
    const asked = open ? drops.find((d) => d.itemId === open) : undefined;
    if (asked) {
      setSubject({ kind: "item", item: asked });
      setHeld(asked);
      return;
    }
    const saved = localStorage.getItem(KEY);
    if (saved === "open" && plate) setSubject({ kind: "map" });
    else if (saved === null && plate) setFresh(true);
  }, [plate, open, drops]);

  const setMap = useCallback((next: boolean) => {
    beneath.current = null;
    returnTo.current = null;
    setFocus(null);
    setSubject(next ? { kind: "map" } : null);
    setFresh(false);
    localStorage.setItem(KEY, next ? "open" : "closed");
  }, []);

  const openItem = useCallback((item: Item, from?: HTMLElement | null) => {
    if (from !== undefined) returnTo.current = from;
    setSubject((prev) => {
      beneath.current = prev && prev.kind !== "item" ? prev.kind : beneath.current;
      return { kind: "item", item };
    });
    setHeld(item);
  }, []);

  const openKit = useCallback(() => {
    setSubject((prev) => {
      beneath.current = prev?.kind === "map" ? "map" : null;
      return { kind: "kit" };
    });
  }, []);

  /* The stage's crop: the real map, centred on the spot. Does not write the
     preference — a lent map is a glance, not a way of reading. */
  const openMapAt = useCallback((at: { x: number; y: number }) => {
    setFocus(at);
    beneath.current = null;
    setSubject({ kind: "map" });
  }, []);

  const close = useCallback(() => {
    if (subject?.kind === "item" || subject?.kind === "kit") {
      const back = beneath.current;
      beneath.current = null;
      setSubject(back ? { kind: back } : null);
      if (subject.kind === "item") {
        returnTo.current?.focus();
        returnTo.current = null;
      }
      return;
    }
    if (subject?.kind === "map") {
      /* A lent map closes without a word; only a map the reader opened
         writes the preference when it closes. */
      if (!focus) localStorage.setItem(KEY, "closed");
      setFocus(null);
    }
    setSubject(null);
  }, [subject, focus]);

  // Two ways out, both meaning the same thing: anywhere that is not the
  // subject, and the key everyone already presses to leave something.
  useEffect(() => {
    if (!subject) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [subject, close]);

  /* The map is a place to look around in and keeps the reader where they
     were; the item and the kit are things handed to them, so the card takes
     the focus and Escape has something to return. */
  useEffect(() => {
    if (subject?.kind === "item") card.current?.focus();
    if (subject?.kind === "kit") kitCard.current?.focus();
  }, [subject]);

  const onMap = subject?.kind === "map";
  const onItem = subject?.kind === "item";
  const onKit = subject?.kind === "kit";

  return (
    <DockCtx.Provider value={{ openItem, openKit, openMapAt, close }}>
      {children}

      <div
        className={styles.veil}
        data-stage={subject?.kind}
        aria-hidden="true"
        onClick={close}
      />

      {plate ? (
        <div className={styles.map} data-open={onMap || undefined} aria-hidden={!onMap} inert={!onMap}>
          <ZoneMap
            key={roomId}
            plate={plate}
            title={room}
            roomId={roomId}
            hunt={hunt}
            drops={drops}
            pins={pins}
            level={level}
            focus={focus}
            onOpenItem={(item) => openItem(item, undefined)}
          />
        </div>
      ) : null}

      <div className={styles.stage} data-open={onItem || undefined} aria-hidden={!onItem} inert={!onItem}>
        <div
          ref={card}
          className={styles.card}
          role="dialog"
          aria-modal="true"
          aria-label={held ? `${held.name}, and where it is` : undefined}
          tabIndex={-1}
        >
          {held ? (
            <ItemStage
              item={held}
              level={level}
              room={room}
              plate={plate}
              hunt={hunt}
              drops={drops}
              onClose={close}
              onMap={openMapAt}
              onItem={(item) => openItem(item, undefined)}
            />
          ) : null}
        </div>
      </div>

      {kit ? (
        <div className={styles.kit} data-open={onKit || undefined} aria-hidden={!onKit} inert={!onKit}>
          <div
            ref={kitCard}
            className={styles.kitCard}
            role="dialog"
            aria-modal="true"
            aria-label="Your kit, in this room"
            tabIndex={-1}
          >
            {kit}
          </div>
        </div>
      ) : null}

      {plate ? (
        <button
          type="button"
          className={styles.compass}
          data-open={onMap || undefined}
          data-fresh={fresh || undefined}
          aria-pressed={onMap}
          aria-label={onMap ? "Fold map" : "View map"}
          onClick={() => setMap(!onMap)}
        >
          <span className={styles.halo} aria-hidden="true" />
          <Compass className={styles.rose} />
          <span className={styles.word}>{onMap ? "Fold map" : "View map"}</span>
        </button>
      ) : null}
    </DockCtx.Provider>
  );
}
