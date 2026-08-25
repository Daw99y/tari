"use client";

/* A row of pictures you can pull sideways with the mouse.
 *
 * A native scroller answers a trackpad and a wheel, and nothing at all to a
 * mouse held down and moved — so the strip looked broken to anyone without
 * two fingers. This adds the one thing missing: press, drag, let go, with
 * the pointer captured so the drag survives leaving the element. Keyboard
 * and wheel scrolling are untouched, and the strip keeps its snap. */

import { useRef, type ReactNode } from "react";

type Props = {
  className?: string;
  /** Read out by the region, e.g. "Six of the 75 rooms." */
  label: string;
  children: ReactNode;
};

export default function DragStrip({ className, label, children }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const from = useRef({ x: 0, left: 0, dragging: false });

  const end = (pointerId: number) => {
    if (!from.current.dragging || !el.current) return;
    from.current.dragging = false;
    if (el.current.hasPointerCapture(pointerId)) el.current.releasePointerCapture(pointerId);
    el.current.dataset.drag = "idle";
    el.current.style.scrollSnapType = "";
  };

  return (
    <div
      ref={el}
      className={className}
      role="group"
      aria-label={label}
      tabIndex={0}
      data-drag="idle"
      onPointerDown={(e) => {
        // Mouse and pen only. Touch already drags, and stealing it would
        // kill the flick.
        if (e.pointerType === "touch" || !el.current) return;
        // A press on a link or button is a click, not a drag; capturing
        // the pointer here would steal it.
        if ((e.target as Element).closest("a, button")) return;
        from.current = { x: e.clientX, left: el.current.scrollLeft, dragging: true };
        el.current.setPointerCapture(e.pointerId);
        el.current.dataset.drag = "holding";
        // Off during the drag, or every snap point fights the hand.
        el.current.style.scrollSnapType = "none";
      }}
      onPointerMove={(e) => {
        if (!from.current.dragging || !el.current) return;
        e.preventDefault();
        el.current.scrollLeft = from.current.left - (e.clientX - from.current.x);
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
