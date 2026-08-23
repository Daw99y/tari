/**
 * THE RECORD, IN TRANSIT.
 *
 * Shapes and one guard, and nothing that touches a database or a browser — the
 * same division lib/live.ts keeps, and for the same reason: the route and the
 * client both import this, so anything platform-shaped in here would end up in
 * a bundle it has no business being in.
 *
 * WHAT A SYNC IS. One conversation: the device says what changed and what it
 * last heard, the server writes the first half and answers with everything the
 * account has changed since the second. Push and pull in one round trip,
 * because a merge conducted over two requests can interleave with itself.
 *
 * WHAT IT IS NOT. An identity, a feature gate, or a reason to be signed in.
 * COMMUNITY.md governs: a stranger keeps the whole tool. This carries a record
 * between two machines belonging to one person and does nothing else.
 */

/** The five mark stores. `equip` is the odd one and see `val` below. */
export const MARK_KINDS = ["found", "wish", "done", "equip", "been"] as const;
export type MarkKind = (typeof MARK_KINDS)[number];

/**
 * One mark, in one direction.
 *
 * `on: false` is a tombstone and it is the load-bearing part of this file. An
 * un-tick has to be able to beat an older tick from the reader's other
 * machine, and a record that only ever grows cannot say "no longer".
 *
 * `val` is null for the four set-shaped stores. Equip is a map of slot to item
 * rather than a set, so its `subject` is the slot index and its `val` is the
 * item in it — which keeps one table rather than inventing a second for one
 * store.
 */
export type Mark = {
  char: string;
  kind: MarkKind;
  subject: string;
  val?: string | null;
  on: boolean;
};

/**
 * A character, whole. The profile is small and always read and written whole,
 * so it travels as one object rather than a column per field.
 *
 * `gone` is the shelf's tombstone, and it exists for the reason `on: false`
 * does. Taking a character off the shelf on one machine has to beat the other
 * machine's older copy of it, or the reader deletes a character and watches it
 * walk back in on the next pull.
 */
export type Char = {
  char: string;
  profile: Record<string, unknown>;
  gone?: boolean;
};

export type SyncPush = {
  /** The server timestamp the last pull answered with, or null for "give me
      everything" — a fresh device, or the first sync after signing in. */
  since: string | null;
  marks: Mark[];
  chars: Char[];
};

export type SyncPull = {
  /** The new cursor. A few seconds behind the server's clock when the page was
      whole, and the last row's own time when it was not — see the route. */
  at: string;
  marks: Mark[];
  chars: Char[];
  /** The page hit the cap. Ask again straight away rather than at the next
      tick, or the tail of a big first sync arrives one debounce at a time. */
  more?: boolean;
};

/* Limits. The first sync of a heavy account is the big one — nine characters
   with a few hundred marks each — and the client chunks rather than asking for
   a bigger cap here. */
export const MAX_MARKS = 1000;
export const MAX_CHARS = 60;
const MAX_KEY = 80;
const MAX_SUBJECT = 120;
const MAX_VAL = 40;
/** A StoredProfile with a full gear photograph in it. Comfortably over, and
    still small enough that a paste cannot be used as storage. */
const MAX_PROFILE = 20_000;

function str(v: unknown, max: number): boolean {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}

/**
 * The body, checked key by key.
 *
 * Unknown keys REFUSE the request rather than being dropped — the feedback
 * route's posture, and the events route's. A body this app did not write is a
 * body it should not half-understand, and silently ignoring a field is how a
 * client bug ships as a data bug.
 */
export function readPush(body: unknown): SyncPush | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const o = body as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!["since", "marks", "chars"].includes(k)) return null;

  if (!(o.since === null || o.since === undefined || str(o.since, 40))) return null;
  const since = typeof o.since === "string" ? o.since : null;

  const rawMarks = o.marks === undefined ? [] : o.marks;
  const rawChars = o.chars === undefined ? [] : o.chars;
  if (!Array.isArray(rawMarks) || !Array.isArray(rawChars)) return null;
  if (rawMarks.length > MAX_MARKS || rawChars.length > MAX_CHARS) return null;

  const marks: Mark[] = [];
  for (const m of rawMarks) {
    if (!m || typeof m !== "object" || Array.isArray(m)) return null;
    const r = m as Record<string, unknown>;
    for (const k of Object.keys(r))
      if (!["char", "kind", "subject", "val", "on"].includes(k)) return null;
    if (!str(r.char, MAX_KEY)) return null;
    if (!MARK_KINDS.includes(r.kind as MarkKind)) return null;
    if (!str(r.subject, MAX_SUBJECT)) return null;
    if (typeof r.on !== "boolean") return null;
    if (!(r.val === null || r.val === undefined || str(r.val, MAX_VAL))) return null;
    marks.push({
      char: r.char as string,
      kind: r.kind as MarkKind,
      subject: r.subject as string,
      val: typeof r.val === "string" ? r.val : null,
      on: r.on,
    });
  }

  const chars: Char[] = [];
  for (const c of rawChars) {
    if (!c || typeof c !== "object" || Array.isArray(c)) return null;
    const r = c as Record<string, unknown>;
    for (const k of Object.keys(r))
      if (!["char", "profile", "gone"].includes(k)) return null;
    if (!str(r.char, MAX_KEY)) return null;
    if (!(r.gone === undefined || typeof r.gone === "boolean")) return null;
    if (!r.profile || typeof r.profile !== "object" || Array.isArray(r.profile)) return null;
    /* Measured rather than trusted: a profile is a blob this app does not read
       the inside of, so its size is the only thing worth checking about it. */
    let size = 0;
    try {
      size = JSON.stringify(r.profile).length;
    } catch {
      return null;
    }
    if (size > MAX_PROFILE) return null;
    chars.push({
      char: r.char as string,
      profile: r.profile as Record<string, unknown>,
      gone: r.gone === true,
    });
  }

  return { since, marks, chars };
}
