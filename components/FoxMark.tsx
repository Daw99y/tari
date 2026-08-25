/* Placeholder until the fox is drawn (docs/TARI.md §15.3). Two surfaces now
 * print it — the landing bar and the shell rail — so it lives here rather
 * than twice. */

export default function FoxMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3.5 9 8.5h6l6-5-1 9.5c0 4.4-3 7.4-8 8.5-5-1.1-8-4.1-8-8.5Z" />
      <circle cx="9.2" cy="13" r="1.1" fill="var(--ground)" />
      <circle cx="14.8" cy="13" r="1.1" fill="var(--ground)" />
    </svg>
  );
}
