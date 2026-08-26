/* THE WISH MARK. One glyph, one meaning: this is what you are hunting.
 *
 * Lived inline in the room's kit row until the dressing room needed the same
 * star on the sheet. A star drawn twice is two stars the day one of them is
 * redrawn, so it is drawn here and imported by both. Stroke in currentColor;
 * filled when it is on, hollow when it is not — the tick's own register.
 */

export default function WishStar({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path
        d="M6 1.4 7.4 4.5 10.8 4.9 8.3 7.2 9 10.6 6 8.9 3 10.6 3.7 7.2 1.2 4.9 4.6 4.5Z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}
