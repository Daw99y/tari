"use client";

/* THE TOOLTIP. The game's own plate, on Tari's data — ported from whelp plz
 * and restyled only where docs/DESIGN.md demanded it (focus ring, breakpoint,
 * the tap mark's hairline). docs/DESIGN.md "The plate" has the argument; the
 * short version is that a player who has hovered ten thousand items expects
 * the whole record beside the cursor, in the game's exact words, and a
 * quotation is either exact or wrong.
 *
 * Behaviour, in brief: hover after a 150ms delay on a big screen with a real
 * pointer; tap to open elsewhere; Escape, blur, or a press anywhere else
 * closes; one plate at a time; the plate follows scroll rather than dying on
 * the first pixel of it; nothing inside it is clickable. */

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { FACTION_LABEL } from "@/lib/faction";
import { iconUrl, type Item } from "@/lib/loot";
import {
  armorLine,
  bindLine,
  damageLine,
  dpsLine,
  durabilityLine,
  exclusiveFaction,
  itemLevelLine,
  moneyCoins,
  proficiencyLine,
  requiredLevelLine,
  sourceLines,
  speedLine,
  statParts,
  subclassLine,
  type Coin,
} from "@/lib/tooltip";

import SlotGlyph from "./SlotGlyph";
import styles from "./item-tooltip.module.css";

/** Long enough that a cursor crossing the panel on its way somewhere never fires it. */
const OPEN_DELAY = 150;
/** Between the plate and what it describes. */
const GAP = 10;
/** And between the plate and the viewport. */
const EDGE = 8;
/** The icon's reserve: 48 of well, 8 of air, outside the plate. */
const ICON_SPACE = 56;

/* One at a time, held in a module variable — one bit of state does not need
 * a provider. */
let openTooltip: (() => void) | null = null;

type Placement = {
  x: number;
  y: number;
  maxHeight: number;
  icon: "left" | "right";
};

/* Beside the trigger if either side has room (right first — the rows sit at
 * the right edge of the room, so left is usually the answer), otherwise
 * under, otherwise over. Never covering the name. The plate may scroll
 * rather than overflow the viewport. */
function place(
  rect: DOMRect,
  size: { width: number; height: number },
  vw: number,
  vh: number,
): Placement {
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const fits = vh - EDGE * 2;
  const beside = clamp(rect.top - 4, EDGE, Math.max(EDGE, vh - size.height - EDGE));

  if (rect.right + GAP + ICON_SPACE + size.width <= vw - EDGE) {
    return { x: rect.right + GAP + ICON_SPACE, y: beside, maxHeight: fits, icon: "left" };
  }
  if (rect.left - GAP - ICON_SPACE - size.width >= EDGE) {
    return {
      x: rect.left - GAP - ICON_SPACE - size.width,
      y: beside,
      maxHeight: fits,
      icon: "right",
    };
  }

  /* Stacked: the narrow window. Centred as a composition — icon plus plate —
   * so the plate does not wander with each row's indent. */
  const x = clamp(
    (vw - size.width + ICON_SPACE) / 2,
    EDGE + ICON_SPACE,
    Math.max(EDGE + ICON_SPACE, vw - size.width - EDGE),
  );
  const below = vh - rect.bottom - GAP - EDGE;
  const above = rect.top - GAP - EDGE;
  if (size.height <= below || below >= above) {
    return { x, y: rect.bottom + GAP, maxHeight: Math.max(120, below), icon: "left" };
  }
  return {
    x,
    y: Math.max(EDGE, rect.top - GAP - Math.min(size.height, above)),
    maxHeight: Math.max(120, above),
    icon: "left",
  };
}

/** Hovering is what this window does on 64rem-and-up with a real pointer —
 *  the same line under which the objects column exists at all. */
function hoverable(): boolean {
  return window.matchMedia("(min-width: 1024px) and (hover: hover)").matches;
}

/**
 * The trigger: whatever stands in for the item. A bare span, no box of its
 * own, so it drops into a truncating row without touching it. The plate is
 * portalled to <body>, so opening one moves nothing on the page.
 */
export function ItemHover({
  item,
  level,
  /** Inside a link, hover and focus still open the plate; a tap follows the
   *  link instead — the tooltip never steals a navigation. */
  inLink,
  /** The name is a tab stop; the icon beside it is not — two doors, one card. */
  focusable = true,
  /** The dotted mark a touch device gets in place of a cursor. On the name
   *  only, which is type; never the icon. */
  tap = false,
  className,
  children,
}: {
  item: Item;
  level: number;
  inLink?: boolean;
  focusable?: boolean;
  tap?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<Placement | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const id = useId();

  // The portal needs a document; the first render happens without one.
  useEffect(() => setMounted(true), []);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /* One stable identity per instance, so the singleton can tell "someone
   * else is open" from "I am". */
  const mine = useRef<(() => void) | null>(null);

  const close = useCallback(() => {
    cancel();
    if (openTooltip === mine.current) openTooltip = null;
    setOpen(false);
    setAt(null);
  }, [cancel]);

  const closeRef = useRef(close);
  closeRef.current = close;
  if (!mine.current) mine.current = () => closeRef.current();

  const show = useCallback(() => {
    cancel();
    if (openTooltip && openTooltip !== mine.current) openTooltip();
    openTooltip = mine.current;
    setOpen(true);
  }, [cancel]);

  useEffect(() => {
    const self = mine.current;
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (openTooltip === self) openTooltip = null;
    };
  }, []);

  /* Measure, then place — two passes in one frame, so the unplaced plate is
   * never painted. */
  useLayoutEffect(() => {
    if (!open) return;

    let frame = 0;
    const measure = () => {
      const t = triggerRef.current;
      const c = plateRef.current;
      if (!t || !c) return;
      setAt(
        place(
          t.getBoundingClientRect(),
          { width: c.offsetWidth, height: c.offsetHeight },
          window.innerWidth,
          window.innerHeight,
        ),
      );
    };
    measure();

    /* Follow rather than close: a plate that dies on the first pixel of
     * scroll is unusable with a trackpad. */
    const track = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    window.addEventListener("scroll", track, true);
    window.addEventListener("resize", track);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    /* pointerdown, not click: it lands before a link's navigation and before
     * the next trigger's own handler. */
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (plateRef.current?.contains(target)) return;
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", track, true);
      window.removeEventListener("resize", track);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  /* Hover is a mouse's gesture; the pointer type comes off the event because
   * the same laptop is both. */
  const onEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (!hoverable()) return;
    cancel();
    timer.current = window.setTimeout(show, OPEN_DELAY);
  };

  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    cancel();
    // No close delay: the plate is beside the name, never over it, and
    // nothing in it is clickable — there is no gap to cross.
    if (open) close();
  };

  const onClick = (e: React.MouseEvent) => {
    if (inLink) return;
    e.preventDefault();
    if (open) close();
    else show();
  };

  /* Keyboard focus opens it; a click that happens to focus the span does
   * not — :focus-visible is the browser's own answer to "was this the
   * keyboard". */
  const onFocus = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (e.target.matches(":focus-visible")) show();
  };

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={inLink || !focusable ? undefined : 0}
        aria-describedby={open ? id : undefined}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onClick={onClick}
        onFocus={inLink || !focusable ? undefined : onFocus}
        onBlur={inLink || !focusable ? undefined : close}
        className={`${styles.trigger} ${tap && !inLink ? styles.tap : ""} ${className ?? ""}`}
      >
        {children}
      </span>

      {mounted && open
        ? createPortal(
            /* Two elements, one position: the plate scrolls when it is
             * taller than the window, and the icon hangs outside that. */
            <div
              className={styles.float}
              style={{
                left: at ? at.x : 0,
                top: at ? at.y : 0,
                // Placed or not drawn — the unplaced frame is never painted.
                visibility: at ? "visible" : "hidden",
              }}
            >
              <PlateIcon item={item} side={at ? at.icon : "left"} />
              <div
                ref={plateRef}
                id={id}
                role="tooltip"
                className={styles.plate}
                style={{ maxHeight: at ? at.maxHeight : undefined }}
              >
                <TooltipBody item={item} level={level} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/* The icon, off the plate's edge — how a WoW tooltip announces a thing you
 * can pick up. No quality ring: the name beside it wears the colour. A
 * failed request drops back to the drawn glyph. */
function PlateIcon({ item, side }: { item: Item; side: "left" | "right" }) {
  const [failed, setFailed] = useState(false);
  const src = iconUrl(item);

  return (
    <span
      className={`${styles.icon} ${side === "left" ? styles.iconL : styles.iconR}`}
      aria-hidden="true"
    >
      <SlotGlyph slot={item.slot} className={styles.glyph} />
      {src && !failed ? (
        <span className={styles.iconFrame}>
          <img
            src={src}
            alt=""
            width={56}
            height={56}
            decoding="async"
            onError={() => setFailed(true)}
          />
        </span>
      ) : null}
    </span>
  );
}

/* A line with its qualifier hard against the right edge — the game's own
 * device. With no right half it is an ordinary line, which is what a
 * shield's slot row is. */
function Split({
  left,
  right,
  className,
  rightClassName,
}: {
  left: string;
  right?: string | null;
  className?: string;
  rightClassName?: string;
}) {
  if (!right) return <p className={className}>{left}</p>;
  return (
    <p className={`${styles.split} ${className ?? ""}`}>
      <span>{left}</span>
      <span className={rightClassName}>{right}</span>
    </p>
  );
}

/* "Sell Price: 20● 69● 67●" — drawn coins, each with its unit spelled out
 * for a screen reader. */
function SellPrice({ coins }: { coins: Coin[] }) {
  return (
    <p className={styles.tnum}>
      Sell Price:{" "}
      {coins.map((coin) => (
        <Fragment key={coin.unit}>
          {coin.amount}
          <span className={`${styles.coin} ${COIN_CLASS[coin.unit]}`} aria-hidden="true" />
          <span className={styles.srOnly}> {coin.unit} </span>
        </Fragment>
      ))}
    </p>
  );
}

const COIN_CLASS: Record<Coin["unit"], string> = {
  gold: styles.coinGold,
  silver: styles.coinSilver,
  copper: styles.coinCopper,
};

/* The plate's contents, in the game's order and the game's words. Almost
 * every line is optional — a ring has no speed, a quest reward no
 * durability — and each renders nothing when its answer is null. */
export function TooltipBody({ item, level }: { item: Item; level: number }) {
  const side = exclusiveFaction(item);
  const prof = proficiencyLine(item, level);

  const itemLevel = itemLevelLine(item);
  const bind = bindLine(item);
  const subclass = subclassLine(item);
  const damage = damageLine(item);
  const dps = dpsLine(item);
  const armor = armorLine(item);
  const stats = statParts(item);
  const durability = durabilityLine(item);
  const required = requiredLevelLine(item);
  const effects = item.effects ?? [];
  const coins = item.sellPriceCopper ? moneyCoins(item.sellPriceCopper) : null;

  /* The game's red — never the only signal; the words still say the level. */
  const unmet = item.requiredLevel > level;

  return (
    <div>
      {/* Wraps rather than truncates: the plate exists to state the whole
          name; the row that opened it already ellipses. */}
      <p className={styles.name} data-quality={item.quality}>
        {item.name}
      </p>

      {/* Gold left, as the game sets it; the quality in a word on the right,
          so nothing on the plate is carried by colour alone. */}
      {itemLevel ? (
        <Split
          left={itemLevel}
          right={item.quality}
          className={`${styles.tnum} ${styles.gold}`}
          rightClassName={styles.gray}
        />
      ) : null}

      {bind ? <p>{bind}</p> : null}
      {item.unique ? <p>Unique</p> : null}

      <Split left={item.slot} right={subclass} />

      {damage ? <Split left={damage} right={speedLine(item)} className={styles.tnum} /> : null}
      {dps ? <p className={styles.tnum}>{dps}</p> : null}
      {armor ? <p className={styles.tnum}>{armor}</p> : null}

      {stats.map((s) => (
        <p key={s} className={styles.tnum}>
          {s}
        </p>
      ))}

      {durability ? <p className={styles.tnum}>{durability}</p> : null}
      {required ? <p className={unmet ? styles.red : undefined}>{required}</p> : null}

      {/* Tari's one line above the rule: the game cannot say "you train
          mail at 40" on an item you are reading at 30. Gray — a note, not a
          property. */}
      {prof ? <p className={styles.gray}>{prof}</p> : null}

      {effects.map((e) => (
        <p key={e} className={styles.green}>
          {e}
        </p>
      ))}

      {coins ? <SellPrice coins={coins} /> : null}

      {/* The rule earns its place: above it the game's tooltip, below it
          what Tari knows that the game does not. */}
      <div className={`${styles.rule} ${styles.gray}`}>
        {sourceLines(item, level).map((line) => (
          <p key={line} className={styles.tnum}>
            {line}
          </p>
        ))}
        {side ? <p>{FACTION_LABEL[side]} only</p> : null}
      </div>
    </div>
  );
}
