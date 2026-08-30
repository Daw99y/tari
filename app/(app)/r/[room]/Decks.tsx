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
 * Kacey asked for a toggle per deck plus a way to hide both. This is one
 * control instead of two, because the three answers are exclusive — you are
 * reading the guide, or you are reading the room, or you are looking at the
 * photograph — and three states in one object is a thing you can learn in one
 * glance. It is chips, which is what the house does with a set of things
 * (docs/DESIGN.md, Surfaces).
 *
 * "Just the room" is not a hide button dressed as a chip. It is the third
 * real answer, and it is the product's own argument: a companion that slows
 * you down has to be able to get out of the way of the place.
 *
 * BOTH DECKS STAY MOUNTED. The inactive one is hidden rather than unmounted,
 * so the room's pin channel is still listening while you read the guide and
 * a pin that lands is on top of the stack when you switch. */

import { useEffect, useState, type ReactNode } from "react";

import styles from "./decks.module.css";

const KEY = "tari:deck";

type Choice = "telling" | "left" | "none";

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

  return (
    <>
      {has ? <div hidden={choice !== "telling"}>{telling}</div> : null}
      <div hidden={choice !== "left"}>{left}</div>

      <div className={styles.switch} data-story role="group" aria-label="What to show in this room">
        {has ? (
          <Chip on={choice === "telling"} onPress={() => choose("telling")}>
            The telling
          </Chip>
        ) : null}

        <Chip on={choice === "left"} onPress={() => choose("left")}>
          Left here
          {pins > 0 ? <span className={styles.count}>{pins}</span> : null}
        </Chip>

        <Chip on={choice === "none"} onPress={() => choose("none")}>
          Just the room
        </Chip>
      </div>
    </>
  );
}

/* One chip. The current one is turned over — ink ground, dark text — which is
 * what the house already does with a chip that is a state rather than a link
 * (docs/DESIGN.md, Surfaces). No accent: choosing what to read is not
 * something anybody left for you. */
function Chip({
  on,
  onPress,
  children,
}: {
  on: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={styles.chip} data-on={on || undefined} aria-pressed={on} onClick={onPress}>
      {children}
    </button>
  );
}
