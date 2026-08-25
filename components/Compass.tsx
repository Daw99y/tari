/* The compass that holds the room's corner and unfolds the map.
 *
 * It replaces a 500px screenshot of the in-game item — a boxed octagonal
 * compass drawn in three-quarter perspective, lid open, lit like a loot
 * icon. At the 44px it is actually used at that read as a gold blob, and it
 * blurred on every retina screen.
 *
 * This is the flat cut: a ring, a wire globe, and four spikes. One colour,
 * no gradient, no bevel, no shading — so it is legible at 20px and still
 * exact blown up to 200. Everything sits on a 48-unit grid, which is what
 * keeps the strokes landing on whole device pixels.
 *
 * The spikes run to the edge of the viewBox rather than stopping at a
 * margin, so the drawing's bounding box is the artwork and a CSS width maps
 * to it with no phantom padding.
 *
 * Colour comes from the caller: the whole mark is `currentColor`.
 */

const RING = 15.2;
const RING_STROKE = 2.8;
const GLOBE = 11.4;
const GLOBE_STROKE = 1.4;

/** Half-width where a spike meets the ring, and where that meeting sits. */
const HALF = 3;
const EDGE = RING + RING_STROKE / 2;

/** North, east, south, west. Wide at the ring, sharp at the viewBox edge. */
const SPIKES = [
  `M24 0L${24 - HALF} ${24 - EDGE}L${24 + HALF} ${24 - EDGE}Z`,
  `M48 24L${24 + EDGE} ${24 - HALF}L${24 + EDGE} ${24 + HALF}Z`,
  `M24 48L${24 + HALF} ${24 + EDGE}L${24 - HALF} ${24 + EDGE}Z`,
  `M0 24L${24 - EDGE} ${24 + HALF}L${24 - EDGE} ${24 - HALF}Z`,
];

/** A parallel, drawn as the chord the globe leaves at that latitude. */
function parallel(dy: number) {
  const c = Math.sqrt(GLOBE * GLOBE - dy * dy);
  return `M${24 - c} ${24 + dy}H${24 + c}`;
}

/** The two slanted meridians, as one ellipse traced both ways. */
const MERIDIAN = `M24 ${24 - GLOBE}A${GLOBE * 0.47} ${GLOBE} 0 0 1 24 ${24 + GLOBE}A${GLOBE * 0.47} ${GLOBE} 0 0 1 24 ${24 - GLOBE}Z`;

export default function Compass({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <g fill="currentColor">
        {SPIKES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle cx="24" cy="24" r={RING} fill="none" stroke="currentColor" strokeWidth={RING_STROKE} />
      <g fill="none" stroke="currentColor" strokeWidth={GLOBE_STROKE} strokeLinecap="round">
        <circle cx="24" cy="24" r={GLOBE} />
        <path d={parallel(0)} />
        <path d={parallel(-GLOBE * 0.5)} />
        <path d={parallel(GLOBE * 0.5)} />
        <path d={`M24 ${24 - GLOBE}V${24 + GLOBE}`} />
        <path d={MERIDIAN} />
      </g>
    </svg>
  );
}
