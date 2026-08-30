/* THE KIT. docs/WELCOME.md §1 — the packing list a stranger is handed before
 * anything else, and the one surface in the product that is allowed to talk
 * about Tari rather than about Azeroth.
 *
 * It is a deck, the third use of the grammar the telling and the room's card
 * stack already are (Story.tsx, Left.tsx). Hand-written, one file, no room:
 * the kit is about the reader, not a place, so it stands on the shell's own
 * ground rather than on a photograph.
 *
 * NO COMPLETION STATE (docs/TARI.md §4.2). There is no progress, nothing is
 * ticked, every card is skippable and the deck stays reachable forever. A kit
 * you can finish is a tutorial, which is the thing this is not. */

import kit from "../reference/kit.json";

export type KitCard = {
  id: string;
  /** The card's register, in the eyebrow slot the telling uses. */
  eyebrow: string;
  subject: string;
  tag?: string;
  lines: string[];
  /** The last card is a door: it ends the kit in front of the composer,
   *  because the first thing you do in Tari should be for somebody else. */
  door?: "pin";
  /** The card's object: a file under `public/kit/`, extension and all, or an
   *  absolute path when the art already lives somewhere else (the last card
   *  wears the pin's own treasure map).
   *
   *  A card with no icon draws no tile, and the two argument cards have none
   *  on purpose — they are not objects, and there is nothing in the game that
   *  means them. Inventing a tile for them would be the drawn vocabulary
   *  TARI.md §7.1 keeps out of this slot. public/kit/README.md has the table. */
  icon?: string;
};

export const KIT = (kit.cards ?? []) as KitCard[];
