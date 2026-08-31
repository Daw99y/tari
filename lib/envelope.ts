/**
 * THE ENVELOPE. docs/WELCOME.md §3.3.
 *
 * WoW's mail icon is the softest notification ever designed: it is a small
 * mark on a screen you were already looking at, it never makes a sound, and it
 * waits exactly as long as you want it to. This is that icon.
 *
 * THE SPLIT THIS FILE ENFORCES (§3.2 rule 1). Azeroth may interrupt you; Tari
 * may not. "The Faire leaves Elwynn on Sunday" is a thing about the world and
 * is allowed to reach you where you are. "Someone replied to your pin" is a
 * thing about this product, and it waits here. Every kind below is the second
 * sort, which is why nothing in this file can become a push — see WORLD_THINGS
 * in lib/nudge.ts for the other half, and note that the two lists share no
 * member and never will.
 *
 * THREE CHANNELS, NO OVERLAP (§3.4). A moment is not recorded and interrupts
 * nobody. The envelope is recorded and interrupts nobody. Push is recorded and
 * interrupts you only when you are not playing. Nothing else gets added.
 *
 * NO COUNT ON THE MARK, and this is the one that will be argued with. §13
 * refuses a number that only goes up, and a bold `12` on an envelope is the
 * oldest engagement device on the internet — it exists to make the unopened
 * feel owed. The mark says *something* or *nothing*, and the list inside says
 * what. An unread total is the same mistake as a follower total.
 *
 * NOTHING HERE EVER SAYS YOU HAVE BEEN AWAY. §3.2 rule 1 again, in its
 * permanent form: "you haven't opened Tari in three days" is refused forever.
 * Absence is §4's business and §4 pays it rather than billing for it.
 *
 * Shapes and sentences only — no pool, no browser. app/api/envelope holds the
 * read and the write.
 */

/** What the envelope may ever hold. Adding a kind means answering, in this
 *  file, why it is about Tari rather than about Azeroth — if it is about
 *  Azeroth it belongs in lib/nudge.ts and may be pushed. */
export const NOTICE_KINDS = ["reply", "follow", "seeded"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export type Notice = {
  id: number;
  kind: NoticeKind;
  /** The room it happened in, when it happened in one. */
  room: string | null;
  /** What it was about: a pin's opening words, or a room's name. */
  subject: string | null;
  /** Who did it, as a character name. A claim, like every name in presence. */
  actor: string | null;
  actorCls: string | null;
  /** The pin this is about, when there is one — the envelope's only door. */
  ref: number | null;
  /** When it was seen. Null is unopened. */
  readAt: string | null;
  at: string;
};

export function isNoticeKind(v: unknown): v is NoticeKind {
  return typeof v === "string" && (NOTICE_KINDS as readonly string[]).includes(v);
}

/**
 * How much the envelope holds before the oldest falls out.
 *
 * It is a mailbox and not a history. Nothing in Tari is improved by being
 * able to scroll back through six months of "someone replied", and a list with
 * a bottom is a list you can finish — §13's "nothing here ends only when you
 * close the tab", applied to the one surface most likely to grow a feed.
 */
export const ENVELOPE_LIMIT = 50;

/** The sentence, in three parts so the named thing can be set on its own —
 *  the same shape lib/live.ts uses for the past layer, and for the same
 *  reason: the name wants the class colour and the rest does not. */
export function noticeParts(n: Notice): { lead: string; name: string; tail: string } {
  const who = n.actor || "Somebody";
  switch (n.kind) {
    case "reply":
      return n.subject
        ? { lead: `${who} answered your pin about `, name: n.subject, tail: "" }
        : { lead: `${who} answered `, name: "your pin", tail: "" };
    case "follow":
      return { lead: "", name: who, tail: " is following where you stand" };
    case "seeded":
      /* A room you left the first pin in has people in it now. The one notice
         that is a thank-you rather than an event, and the reason the seed is
         worth leaving (§2.3: the first thing you do in Tari is for somebody
         else). */
      return n.subject
        ? { lead: "People are standing where you left the first pin in ", name: n.subject, tail: "" }
        : { lead: "People are standing where you left the first pin", name: "", tail: "" };
  }
}

/** Where a notice opens, or null when it opens nothing. A follow has no
 *  place: §7 is place-first and a person is not a destination. */
export function noticeHref(n: Notice): string | null {
  if (!n.room) return null;
  return n.kind === "reply" && n.ref !== null ? `/r/${n.room}?pin=${n.ref}` : `/r/${n.room}`;
}
