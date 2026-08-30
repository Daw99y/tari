"use client";

/* WHICH DECK IS ON THE TABLE.
 *
 * Two things want the middle of the room and they are not the same thing.
 * The telling is written by us, on the land, in a fixed order (Story.tsx).
 * What people left is written by whoever stood here, newest first, and it
 * grows while you are looking at it (Left.tsx). Duskwood already deals
 * fifteen cards; the day it also holds twenty pins, one shuffled stack of
 * thirty-five is not a deck, it is a pile.
 *
 * Kacey asked for a toggle per deck plus a way to hide both, and the first
 * pass answered that with three word-chips — correct, and dead. This is the
 * second: three of the game's own icons in the game's own button, and one
 * word under the row that says what your hand is on. A player who has spent
 * a thousand hours on an action bar knows what a lit slot means before
 * anybody explains it, and that knowledge is worth more than a label.
 *
 * The word comes from the compass (components/dock.module.css, `.word`),
 * which already answers a hover with its own name underneath. One mark, one
 * word, one place — three times, from the same idea.
 *
 * "Just the room" is not a hide button dressed as a slot. It is the third
 * real answer, and it is the product's own argument: a companion that slows
 * you down has to be able to get out of the way of the place. Its face is
 * Vanish — Kacey asked for stealth, and of that family this is the one that
 * means exactly what the control does and the only one that survives 27px.
 * `ability_stealth` is a hooded face; at this size a face is mud, while
 * Vanish's smoke reads as absence, which is the answer being offered.
 *
 * BOTH DECKS STAY MOUNTED. The inactive one is hidden rather than unmounted,
 * so the room's pin channel is still listening while you read the guide and
 * a pin that lands is on top of the stack when you switch. */

import { useEffect, useState, type ReactNode } from "react";

import styles from "./decks.module.css";

const KEY = "tari:deck";

type Choice = "telling" | "left" | "none";

/** The three, in the order a reader meets them: what we wrote, what they
 *  wrote, and the room with neither on it. The faces are the client's own
 *  (docs/TARI.md §7.1 — the game's objects before drawn ones): a tome, the
 *  treasure map the pin already wears everywhere, and Vanish. */
const FACE: Record<Choice, string> = {
  telling: "/deck/telling.jpg",
  left: "/pins/map-x.png",
  none: "/deck/room.jpg",
};

const WORD: Record<Choice, string> = {
  telling: "The telling",
  left: "Left here",
  none: "Just the room",
};

export default function Decks({
  telling,
  left,
  pins,
}: {
  /** The guide's deck, or nothing when this room has no file yet. */
  telling: ReactNode;
  left: ReactNode;
  pins: number;
}) {
  const has = telling !== null && telling !== undefined;

  /* The server cannot read a preference, so the first paint is the room's own
     default and the reader's choice arrives on mount. Rendering the default
     first is the honest order: a guide that flickers away is worse than a
     guide that arrives. */
  const [choice, setChoice] = useState<Choice>(has ? "telling" : "left");
  /* What the pointer is over, which is what the word says. Nothing under the
     pointer and the word falls back to what you are holding. */
  const [over, setOver] = useState<Choice | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "telling" || saved === "left" || saved === "none") {
      /* A reader who left the guide open walks into a room with no guide.
         Their choice is not wrong; there is just nothing to honour it with. */
      setChoice(saved === "telling" && !has ? "left" : saved);
    }
  }, [has]);

  function choose(next: Choice) {
    setChoice(next);
    localStorage.setItem(KEY, next);
  }

  const order: Choice[] = has ? ["telling", "left", "none"] : ["left", "none"];

  return (
    <>
      {has ? <div hidden={choice !== "telling"}>{telling}</div> : null}
      <div hidden={choice !== "left"}>{left}</div>

      <div className={styles.switch} data-story>
        <div className={styles.bar} role="group" aria-label="What to show in this room">
          {order.map((k) => (
            <button
              key={k}
              type="button"
              className={styles.slot}
              data-on={choice === k || undefined}
              aria-pressed={choice === k}
              aria-label={WORD[k]}
              onClick={() => choose(k)}
              onPointerEnter={() => setOver(k)}
              onPointerLeave={() => setOver((was) => (was === k ? null : was))}
              onFocus={() => setOver(k)}
              onBlur={() => setOver((was) => (was === k ? null : was))}
            >
              <img className={styles.face} src={FACE[k]} alt="" draggable={false} />
              <span className={styles.ring} aria-hidden="true" />
              {/* The stack count, in the corner the game puts a stack count
                  in, and only on the deck that has one. */}
              {k === "left" && pins > 0 ? (
                <span className={styles.tally} aria-hidden="true">
                  {pins}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* One word for the whole row: what the pointer is on, or what you are
            holding. It never changes height, so the deck below never moves. */}
        <p className={styles.word} data-hover={over !== null || undefined}>
          {WORD[over ?? choice]}
        </p>
      </div>
    </>
  );
}
