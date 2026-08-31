/**
 * HOW LONG AGO. Pure, and that is the entire point of the file.
 *
 * `age` lived in lib/live.ts, which imports the pool — fine while the only
 * caller was the room, a server component. The envelope is a client component
 * and importing it there dragged `pg` into a browser bundle, where it asks for
 * `dns` and the build stops. lib/sync.ts already writes the rule this file
 * obeys: anything platform-shaped in a module both ends import ends up in a
 * bundle it has no business being in.
 *
 * So the formatter moved here and lib/live.ts re-exports it, which keeps every
 * existing caller untouched. Nothing in this file may ever import anything.
 */

/** "now", "4m", "2h", "3d". No word "ago" — the heading above it carries that. */
export function age(seconds: number): string {
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

/** The same, from a timestamp — what a row out of a table actually holds. */
export function ageOf(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "now";
  return age(Math.max(0, (Date.now() - then) / 1000));
}
