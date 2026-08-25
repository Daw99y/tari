/* Ink-line silhouettes, one per equipment slot — the plate's fallback when
 * an item has no icon (iconName: null) or the CDN fails. Drawn, not sourced,
 * on the same grid the debuff glyphs use. Deliberately generic: a Chest
 * glyph is *a* tunic, never the tunic.
 *
 * Ported from whelp plz. Strokes in currentColor so the surface underneath
 * decides how loud they are. */

type Props = { slot: string; className?: string };

const P = (d: string, key?: string) => (
  <path
    key={key ?? d}
    d={d}
    fill="none"
    strokeWidth={1.25}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

const GLYPHS: Record<string, () => React.ReactNode[]> = {
  chest: () => [
    P("M19 12 L14 15 L11 21 L16 24 V37 H32 V24 L37 21 L34 15 L29 12 Z"),
    P("M19 12 Q24 17 29 12", "neck"),
  ],
  legs: () => [
    P("M15 12 H33 L34 38 H27 L24 24 L21 38 H14 Z"),
    P("M15 19 H33", "hip"),
  ],
  feet: () => [
    P("M16 11 H24 L25 26 Q26 30 31 31 L36 33 V37 H15 Z"),
    P("M15 33 H36", "sole"),
  ],
  hands: () => [
    P("M15 16 Q15 12 19 12 H29 Q33 12 33 16 V28 Q33 36 24 36 Q15 36 15 28 Z"),
    P("M19 12 V21 M24 11 V21 M29 12 V21", "fingers"),
  ],
  wrist: () => [
    P("M14 18 Q24 13 34 18 L34 30 Q24 35 14 30 Z"),
    P("M14 24 H34", "band"),
  ],
  waist: () => [
    P("M9 20 H39 V28 H9 Z"),
    P("M20 17 H28 V31 H20 Z", "buckle"),
  ],
  shoulder: () => [
    P("M11 30 Q11 14 24 14 Q37 14 37 30 Q24 36 11 30 Z"),
    P("M15 26 Q24 22 33 26 M17 20 Q24 17 31 20", "ridges"),
  ],
  back: () => [
    P("M17 12 H31 L37 36 Q30 33 24 36 Q18 39 11 36 Z"),
    P("M17 12 Q24 17 31 12", "collar"),
  ],
  neck: () => [
    P("M12 14 Q24 30 36 14"),
    P("M24 26 L28 32 L24 38 L20 32 Z", "pendant"),
  ],
  finger: () => [
    P("M24 15 A11 11 0 1 1 23.9 15"),
    P("M24 19 A7 7 0 1 0 24.1 19", "inner"),
    P("M21 13 L24 8 L27 13 Z", "stone"),
  ],
  /* A double-bit axe: "Main Hand" is already a sword, and at this size a
     long blade and a short blade are the same drawing. */
  "two-hand": () => [
    P("M24 9 V41"),
    P("M24 13 L35 17 Q36 23 33 27 L24 21 Z", "bit-right"),
    P("M24 13 L13 17 Q12 23 15 27 L24 21 Z", "bit-left"),
  ],
  "main hand": () => [
    P("M24 38 V14 L28 9 L28 14 V38"),
    P("M17 30 H31", "guard"),
    P("M24 38 H28 L26 42 Z", "pommel"),
  ],
  "one-hand": () => [
    P("M24 38 V14 L28 9 L28 14 V38"),
    P("M17 30 H31", "guard"),
    P("M24 38 H28 L26 42 Z", "pommel"),
  ],
  shield: () => [
    P("M11 11 H37 V25 Q37 34 24 39 Q11 34 11 25 Z"),
    P("M24 11 V39 M11 22 H37", "quarters"),
  ],
  held: () => [
    P("M13 13 Q24 10 35 13 V34 Q24 31 13 34 Z"),
    P("M24 11 V33", "spine"),
  ],
  ranged: () => [
    P("M16 9 Q34 24 16 39"),
    P("M16 9 L16 39", "string"),
    P("M12 24 H30", "arrow"),
  ],
};

/** Slots that share a drawing with another slot. */
const ALIAS: Record<string, string> = {
  "off hand": "held",
  trinket: "finger",
  head: "shoulder",
  relic: "held",
  ranged_right: "ranged",
};

function keyFor(slot: string): string | undefined {
  const k = slot.trim().toLowerCase();
  if (GLYPHS[k]) return k;
  if (ALIAS[k] && GLYPHS[ALIAS[k]]) return ALIAS[k];
  return undefined;
}

export default function SlotGlyph({ slot, className }: Props) {
  const k = keyFor(slot);
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor">
        {k ? (
          GLYPHS[k]()
        ) : (
          /* An unmapped slot degrades to a shape, not a hole. */
          P("M13 11 H35 V37 H13 Z")
        )}
      </g>
    </svg>
  );
}
