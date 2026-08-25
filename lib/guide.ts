/* THE GUIDE. docs/TARI.md §6: not more information, the 1% worth a card.
 *
 * Hand-written, one file per room in reference/guide/, sourced from
 * CC BY-SA wiki pages (§6.3) and rewritten. Nothing generated. A room with
 * no file has no guide, and shows nothing.
 *
 * The spoiler shield (§6.1): a card marked `spoiler` gives away a quest's
 * ending, a reveal, or a twist. "First time here" hides them; "Show me
 * everything" is `?seen=all` in the URL, per SHELL.md. */

import duskwood from "../reference/guide/duskwood.json";

export type CardKind = "notice" | "look" | "story" | "before" | "beware";

export const KIND_EYEBROW: Record<CardKind, string> = {
  notice: "Nobody notices this",
  look: "Go look at this",
  story: "The story here",
  before: "Before",
  beware: "It will kill you",
};

export type Card = {
  id: string;
  kind: CardKind;
  /** What the card is about, set large: a name, a place. */
  subject: string;
  title: string;
  body: string;
  spoiler: boolean;
};

export type GuideFile = {
  room: string;
  sources: string[];
  cards: Card[];
};

const GUIDES: Record<string, GuideFile> = {
  duskwood: duskwood as GuideFile,
};

export function guideFor(roomId: string): GuideFile | undefined {
  return GUIDES[roomId];
}

/** The cards the reader may see, and the ones kept back — counted, never sent. */
export function shield(file: GuideFile, seenAll: boolean): { cards: Card[]; locked: Card[] } {
  if (seenAll) return { cards: file.cards, locked: [] };
  return {
    cards: file.cards.filter((c) => !c.spoiler),
    locked: file.cards.filter((c) => c.spoiler).map((c) => ({ ...c, subject: "", title: "", body: "" })),
  };
}
