/**
 * What a note is, agreed once so the sheet and the route cannot drift.
 *
 * The client assembles the body, because the client is the only thing standing
 * on the page that knows the class, the level and the item. The route bounds
 * it, because a field that can be posted from a form can be posted from
 * anywhere — see app/api/feedback/route.ts, which validates against the same
 * names listed here and rejects anything else.
 *
 * The import string is not in this file and must never be. The export is a
 * character's whole record — bags, bank, reputations, hearth, money — and a
 * reader who pasted one did not agree to file their inventory with a bug
 * report. Four fields come off the profile and no more.
 */

/**
 * The five. Chosen once, no free text: a category is a filter on the triage
 * board, and a filter only works over a closed set.
 */
export const CATEGORIES = [
  "wrong data",
  "missing",
  "confusing",
  "idea",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The textarea's own maxLength, enforced again on the server. */
export const NOTE_MAX = 4000;

/**
 * What the reader was looking at when they pressed the word. Present only from
 * a panel's door; a footer note has no subject and says so by omitting it.
 *
 * `place` is the zone or instance the catalogue ranked the item in, and it is
 * null for a worn piece the catalogue never ranked — the panel says as much on
 * screen, and the note should say the same rather than inventing a zone.
 */
export type Subject = {
  kind: "item";
  id: number;
  name: string;
  place: string | null;
};

/** The body posted to /api/feedback. */
export type Report = {
  note: string;
  category: Category;
  /** The pathname. No query, no hash — neither is worth a support channel. */
  path: string;
  /** From the active profile; all three absent for a walk-in. */
  cls?: string;
  level?: number;
  side?: "alliance" | "horde";
  /** Whether a string was ever pasted. A boolean, and nothing more. */
  imported: boolean;
  subject?: Subject;
  /** The honeypot. Empty from a human, every time. */
  hp?: string;
};

/** The keys the route will accept. Anything else is a 400. */
export const FIELDS: readonly (keyof Report)[] = [
  "note",
  "category",
  "path",
  "cls",
  "level",
  "side",
  "imported",
  "subject",
  "hp",
];
