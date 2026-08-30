"use client";

/* The hero and the curtain over it, which have to be one component because
 * they share one fact: whether the hero has arrived.
 *
 * The page is a server component and the two signals it needs — a decoded
 * photograph and a figure that has drawn a frame — are only knowable in the
 * browser, so this thin client boundary holds them and nothing else. Every
 * prop passes straight through to HeroScene. */

import { useCallback, useState, type ComponentProps } from "react";

import HeroScene from "@/components/HeroScene";

import Curtain from "./Curtain";

type Props = Omit<ComponentProps<typeof HeroScene>, "onImage" | "onFigure" | "hold">;

export default function HeroCurtain(props: Props) {
  /* In the order the curtain names them: the hall, then the rogue. */
  const [hall, setHall] = useState(false);
  const [rogue, setRogue] = useState(false);
  /** The hero's sixty-second push-in is held until the curtain starts to
   *  lift. Left to run from page load it plays out behind the curtain, and
   *  the room is handed over already moving — which reads as a stutter,
   *  because the reader sees the tail of a move whose start they missed. */
  const [lifting, setLifting] = useState(false);

  const onImage = useCallback(() => setHall(true), []);
  const onFigure = useCallback(() => setRogue(true), []);
  const onLifting = useCallback(() => setLifting(true), []);

  return (
    <>
      <HeroScene {...props} onImage={onImage} onFigure={onFigure} hold={!lifting} />
      <Curtain done={hall && rogue} ready={[hall, rogue]} onLifting={onLifting} />
    </>
  );
}
