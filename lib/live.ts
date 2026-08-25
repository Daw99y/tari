/* THE PAST LAYER — what has happened in a place, read back.
 *
 * The write side never moved: whelp plz still posts to `events` and it
 * keeps the table warm while Tari is built (STATUS.md §3). This is only the
 * read side, and only for one room at a time. `place` is a room id — both
 * repos slugify the zone name the same way, so the join is the column.
 *
 * docs/TARI.md §4.3 #2 and #5: "since you were last here" and "who came
 * through". Without accounts there is no "you" yet, so for now the card
 * says what happened lately and how many came through today. The account
 * cursor lands on the same query the day it exists. */

import { query } from "./db";

export const KINDS = ["found", "been", "wished", "equipped", "import", "levelled"] as const;
export type Kind = (typeof KINDS)[number];

export type LiveRow = {
  id: number;
  kind: Kind;
  cls: string;
  who: string | null;
  subjectName: string | null;
  level: number | null;
  ageSeconds: number;
  waves: number;
};

export type Past = {
  rows: LiveRow[];
  /** How many events landed in this place in the last 24 hours. */
  today: number;
};

const EMPTY: Past = { rows: [], today: 0 };

type Raw = {
  id: number;
  kind: Kind;
  cls: string;
  who: string | null;
  subject_name: string | null;
  level: number | null;
  age_seconds: number;
  waves: number;
};

/** The last few things that happened here, newest first. Never throws:
    a room with no database behind it is a room, not an error. */
export async function pastIn(place: string, limit = 4): Promise<Past> {
  try {
    const [rows, count] = await Promise.all([
      query<Raw>(
        `select e.id, e.kind, e.cls, e.who, e.subject_name, e.level,
                extract(epoch from now() - e.created_at)::int as age_seconds,
                (select count(*) from waves w where w.event_id = e.id)::int as waves
           from events e
          where e.place = $1
          order by e.created_at desc
          limit $2`,
        [place, limit],
      ),
      query<{ n: number }>(
        `select count(*)::int as n from events
          where place = $1 and created_at > now() - interval '1 day'`,
        [place],
      ),
    ]);
    if (!rows) return EMPTY;
    return {
      rows: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        cls: r.cls,
        who: r.who,
        subjectName: r.subject_name,
        level: r.level,
        ageSeconds: r.age_seconds,
        waves: r.waves,
      })),
      today: count?.[0]?.n ?? 0,
    };
  } catch (e) {
    console.error("live: read failed", e);
    return EMPTY;
  }
}

/** The sentence, in three parts so the named thing can be set differently. */
export function lineParts(row: LiveRow): { lead: string; name: string; tail: string } {
  const who = row.who || `a ${row.cls}`;
  const what = row.subjectName;
  switch (row.kind) {
    case "found":
      return what ? { lead: `${who} found `, name: what, tail: "" } : { lead: `${who} found something`, name: "", tail: "" };
    case "been":
      return what
        ? { lead: `${who} walked into `, name: what, tail: " for the first time" }
        : { lead: `${who} saw somewhere new`, name: "", tail: "" };
    case "wished":
      return what ? { lead: `${who} is hunting `, name: what, tail: "" } : { lead: `${who} added to a wishlist`, name: "", tail: "" };
    case "equipped":
      return what ? { lead: `${who} put on `, name: what, tail: "" } : { lead: `${who} changed gear`, name: "", tail: "" };
    case "levelled":
      return row.level ? { lead: `${who} hit `, name: String(row.level), tail: "" } : { lead: `${who} levelled`, name: "", tail: "" };
    case "import":
      return row.level ? { lead: `${who} arrived at `, name: String(row.level), tail: "" } : { lead: `${who} arrived`, name: "", tail: "" };
  }
}

/** "now", "4m", "2h", "3d". No word "ago"; the card's heading carries it. */
export function age(seconds: number): string {
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}
