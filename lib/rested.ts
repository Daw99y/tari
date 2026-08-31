/**
 * RESTED. docs/WELCOME.md §4 — the §7 inversion applied to the growth mechanic.
 *
 * THE INVERSION. A streak's whole job is to threaten you: the number exists so
 * that breaking it costs something, and the anxiety is the product. Rested does
 * the opposite — time away is what accrues, and the longer you are gone the
 * better the homecoming reads. A daily reader gets "three came through"; a
 * fortnightly one gets a letter. Nothing is defended, so nothing can be lost.
 *
 * WHY THESE COUNTS ARE NOT THE NUMBERS §13 REFUSED. Every number here is
 * measured from a cursor and dies the moment it is read. It describes an
 * absence rather than an achievement, it cannot be accumulated, and there is
 * no version of it that only goes up. §7.1's test — "the moment a Rested badge
 * is earned, it is a streak in a costume" — is survived because none of this
 * is earned by activity. It is earned by being somewhere else.
 *
 * THE TWO RULES (§4.1), and they are the whole file:
 *   1. Never a bar filling in real time. No progress, no anticipation.
 *   2. Never spent. The moment it is a currency you save up, §13 is dead.
 *
 * IT RENDERS WHAT YOU HAVE AND NEVER WHAT YOU HAVEN'T (§5.2). "Nothing
 * happened while you were gone" is not an empty state to be drawn — it is a
 * card that does not exist. The read answers null and the room is a room.
 *
 * NO DIRECTION (§3.2 rule 2). §4's sketch ends "Two new pins near Raven Hill"
 * and the sub-place is dropped here on purpose. A count of what people left is
 * news about a room. The same count with a landmark on it is the first line of
 * a route, and §2.1 does not stop applying because the sentence is friendly.
 *
 * Shapes and the sentence only — no pool, no browser. app/api/rested holds the
 * read and Rested.tsx holds the cursor, the same division lib/sync.ts keeps and
 * for the same reason: both ends import this file.
 */

/** What was true here while you were gone. Every field is since the cursor. */
export type Rested = {
  /** Whole days away, floored. Zero is a reader who was here this morning. */
  days: number;
  /** Came through at your level, per TARI.md §4.3's level-and-place index. */
  came: number;
  /** Pins left in this room since, replies not counted. */
  pins: number;
  /** Replies to pins of yours. */
  replies: number;
  /** The newest answered pin's opening words, for the sentence. */
  answered: string | null;
};

/**
 * How long away is long enough to be told anything.
 *
 * Not a threshold on the feeling — a guard on the cursor. Walking out of a
 * room and back in is not an absence, and a card that says "one came through"
 * about the minute you spent on the sheet is the app narrating itself.
 */
export const RESTED_FLOOR_MS = 60 * 60 * 1000;

/**
 * How stale the cursor has to be before it is worth moving.
 *
 * The stamp is a write to disk and a row on the sync queue, and the room is
 * the segment the rail swaps on every click. Without this, walking the rail
 * through six rooms and back is twelve writes and a sync, all of them saying
 * a thing the record already knew. Under the floor either way, so it cannot
 * change what is drawn — only how often nothing is said twice.
 */
export const RESTED_STAMP_MS = 5 * 60 * 1000;

/** The band the level index reads, either side. TARI.md §4.3. */
export const RESTED_BAND = 2;

/** Tari counts in words up to twenty, like the telling does. */
const WORDS = [
  "No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen", "Twenty",
];

function count(n: number): string {
  return n <= 20 ? WORDS[n] : String(n);
}

/**
 * The heading.
 *
 * The one place the word "rested" is said, and it is said as a description of
 * where you have been rather than as a badge you hold. There is no threshold
 * to cross on purpose — a week reads differently from a night because the
 * sentence under it is longer, not because a state changed.
 */
export function restedHead(days: number): string {
  if (days >= 7) return "Well rested";
  return "Since you were last here";
}

/**
 * The lead — how long you were away, and nothing else.
 *
 * It stands apart from the rows below it and wears no object, because it is
 * the one line that is about you rather than about the room. Null under a day:
 * a homecoming that opens by telling you it has been zero days is a receipt.
 */
export function restedDays(r: Rested): string | null {
  if (r.days < 1) return null;
  return `${count(r.days)} ${r.days === 1 ? "day" : "days"}.`;
}

/** One line of the homecoming, and the object it wears. */
export type RestedRow = {
  /** What the row is about. Rested.tsx maps it to the game's own icon. */
  kind: "pins" | "came" | "answered";
  text: string;
};

/**
 * The rows, in the order they are read.
 *
 * WHAT WAS LEFT COMES FIRST. docs/TARI.md §2.2 — the pin is the atom, and it
 * is the only thing here that another person made on purpose for whoever came
 * next. Presence is weather; a pin was addressed to you before you arrived.
 *
 * AND THE REPLY COMES LAST, which is the one clause about you. It is the
 * reason to open the deck, so it wants to be the line the eye stops on rather
 * than the one it starts with.
 */
export function restedRows(r: Rested): RestedRow[] {
  const rows: RestedRow[] = [];

  if (r.pins > 0) {
    rows.push({ kind: "pins", text: `${count(r.pins)} new ${r.pins === 1 ? "pin" : "pins"}.` });
  }

  if (r.came > 0) {
    rows.push({ kind: "came", text: `${count(r.came)} came through at your level.` });
  }

  if (r.answered) {
    rows.push({ kind: "answered", text: `Someone answered your pin about ${r.answered}.` });
  } else if (r.replies > 0) {
    rows.push({
      kind: "answered",
      text: `${count(r.replies)} ${r.replies === 1 ? "reply" : "replies"} to something you left.`,
    });
  }

  return rows;
}

/** Whether there is anything at all to say. The card's whole gate. */
export function hasNews(r: Rested): boolean {
  return r.came > 0 || r.pins > 0 || r.replies > 0;
}

/**
 * The opening words of a pin, for the reply clause.
 *
 * A subject rather than a quote: enough to remember which of your pins was
 * answered, never enough to be the reply itself. Reading it is a click.
 */
export function subjectOf(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const words = flat.split(" ").slice(0, 5).join(" ");
  return words.length < flat.length ? `${words}…` : words;
}
