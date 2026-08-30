/* THE UPGRADE ARROW. The game's own, redrawn as our vector (§7.1) and worn
 * in the accent — the one colour every player already reads as "better than
 * what you have", and the one Tari now spends on everything left for you
 * (docs/DESIGN.md, The accent).
 *
 * REDRAWN 2026-08-30, on the compass's terms. The first cut was a 24-unit
 * shape with a head seventy per cent of the width and a shaft thirty, plus a
 * flared foot — at rail size that is a bottle, and beside the compass it read
 * as a different hand. This one sits on the same 48-unit grid the compass
 * does, so both marks land their edges on whole device pixels at the sizes
 * they are actually used; the head is a near-equilateral triangle rather than
 * the squat one it was — twenty-five wide by twenty-five tall, over a shaft
 * nine wide — which is the whole difference between an arrow and a lozenge;
 * and it fills its viewBox top to bottom, so the drawing's bounding box is
 * the artwork and a CSS width maps to it with no phantom padding.
 *
 * The rim is in the geometry rather than in CSS, because this mark is worn in
 * three places at three sizes (the room's corner, the rail's rows, the
 * sheet's slots) and a rim written into each of their modules is three copies
 * of one decision. `paint-order: stroke` puts the whole stroke outside the
 * fill, which is a keyline rather than a shape half a stroke smaller — the
 * client's own icons have carried one since 2004 and a flat green shape has
 * no edge of its own on a photograph.
 *
 * Colour and size come from whatever class the caller hangs on it, so the
 * corner can be an instrument and the sheet's can be a mark, off one path. */

export default function UpArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 0.8 L34.8 27 H27.9 V45.5 A1.9 1.9 0 0 1 26 47.4 H22 A1.9 1.9 0 0 1 20.1 45.5 V27 H13.2 Z"
        fill="currentColor"
        stroke="rgba(4, 10, 5, 0.6)"
        strokeWidth="2"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}
