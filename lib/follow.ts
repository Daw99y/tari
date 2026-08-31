/**
 * THE FOLLOW. docs/WELCOME.md §7.
 *
 * > **You can follow. Nothing is counted.**
 *
 * The value is the feed. The poison is the number. No follower total exists
 * anywhere in this product — not publicly, not privately, and not to the
 * person being followed. db/schema.sql writes that refusal as a missing index
 * and says why; this file is the other half of it, and there is deliberately
 * no `countFollowers` for anything to call.
 *
 * THE LORE DOES THE WORK. `/follow` in WoW means you stop steering and let
 * somebody else lead you through a place. That is the thesis in a slash
 * command, and it is why the word is right where "subscribe" would be wrong.
 *
 * PLACE-FIRST, NEVER TIMELINE-FIRST. You follow somebody because of a pin they
 * left in Duskwood, and the payoff is their pins standing out in the rooms
 * *you* walk into — not a chronological feed of their posts. A feed of a
 * person's output is an infinite scroll wearing a friend's face, and §13
 * refuses it. Nothing in this file returns a list of somebody's pins in time
 * order, and nothing should be added that does.
 *
 * Shapes only. app/api/follow holds the write and lib/pins-db.ts stamps the
 * flag on the pins a room already read.
 */

/** Whether a pin's author is somebody you follow. The whole surface of this
 *  feature, and it is one boolean on a row the room was already reading —
 *  which is the point: following changes how a place looks, not what page you
 *  are on. */
export type Followed = { followed: boolean };

/**
 * How many people one account may follow.
 *
 * A ceiling, not a target, and it is nowhere near reachable by hand. It exists
 * so the room's pin read stays one query with a bounded set in it, and so a
 * script cannot turn the table into a graph.
 */
export const FOLLOW_LIMIT = 500;

/** What the room says about a pin from somebody you follow. One word, in the
 *  deck's own register, and never a badge with a number on it. */
export const FOLLOWED_MARK = "You follow";
