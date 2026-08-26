/* THE UPGRADE ARROW. The game's own, redrawn as our vector (§7.1) and worn
 * in its green — the one colour every player already reads as "better than
 * what you have". Gold stays the compass's alone.
 *
 * A file of its own because it is now worn in two places: the room's summons
 * (Drops.tsx) and the sheet's behind slots (docs/DROPS.md step 6). Colour and
 * size come from whatever class the caller hangs on it, so the corner can be
 * an instrument and the sheet's can be a mark, off one path. */

export default function UpArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.4 20.4 11.2 H15.6 V19.8 Q15.6 21.4 14 21.4 H10 Q8.4 21.4 8.4 19.8 V11.2 H3.6 Z"
        fill="currentColor"
        stroke="rgba(4, 10, 5, 0.55)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
