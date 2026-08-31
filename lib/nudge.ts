/**
 * WHAT YOU ASKED TO BE TOLD. docs/WELCOME.md §3.
 *
 * The other half of lib/envelope.ts. That file holds everything about Tari,
 * which waits; this one holds everything about Azeroth, which may reach you
 * where you are. The two lists share no member and never will — that is §3.2
 * rule 1 and it is the line the whole feature stands on.
 *
 * ================= THE CORRECTION THAT SHAPED THIS FILE =================
 *
 * Kacey, 2026-08-31: **the addon and the armory cannot read live position.**
 * Neither can read anything live at all. The addon writes an export string
 * that a reader copies out of the game and pastes in (docs/CHARACTER.md, TA2);
 * the armory answers with the character as of their last logout, and says so.
 * Both are photographs, taken when somebody decides to take one.
 *
 * The first draft of this list did not believe that. It offered *"when I'm
 * near water I've never sat at"*, which is a lovely sentence and a lie: there
 * is nothing in this product that knows where you are standing. That thing is
 * deleted rather than parked, because a toggle that can never fire is worse
 * than an absent feature — the reader ticks it, waits, and learns the app
 * makes things up.
 *
 * SO THE ONLY THINGS HERE ARE THINGS THE SERVER ALREADY KNOWS. Every entry
 * below is a fact about Azeroth on a calendar: it needs no addon, no armory,
 * no client and no reader input, it is the same for everybody in a region, and
 * it can be computed months ahead. That is what makes them *real*
 * notifications rather than promised ones — and it is why the whole list works
 * today, for a signed-out reader on a borrowed laptop, with nothing installed.
 *
 * WHAT THIS COSTS: §3.1's refusal, word for word, was
 * *"Tari never rings while you're playing"*, and it was conditional on the
 * addon knowing combat and instance state. It does not know either. That
 * promise cannot be printed as written and is re-cut below into one this
 * product can actually keep — see NEVER.
 *
 * =======================================================================
 *
 * DELIVERY IS THE ENVELOPE TODAY. Kacey's ruling, 2026-08-31: the opt-in and
 * the choosing ship now; a chosen thing lands in the envelope like everything
 * else. Push is a delivery swap later, not a second feature — this list, the
 * prefs shape and the card's toggles do not change when it arrives.
 *
 * THE RULES, as the testable list §3.2 asks for. Anything added here has to
 * survive all five:
 *
 *   1. It is about Azeroth, never about Tari. Nothing here may mention a
 *      reply, a follower, or how long since you opened this.
 *   2. It carries no direction. §2.1 is not suspended because the message
 *      arrives as a notification.
 *   3. It defends no streak. Nothing here may reference Rested, the almanac,
 *      or any count. This is the rule that keeps §0 true.
 *   4. Quiet hours are load-bearing. Cross-region product; nothing fires at
 *      3am in Perth. Enforced at delivery.
 *   5. It is chosen one at a time and never as a blanket permission.
 *
 *   6. **New, and it is the one this file was rewritten for: it must be
 *      knowable without the reader.** If answering it needs a client that is
 *      running, a position, a combat state, or anything else nothing in this
 *      product can see, it does not go on the list.
 */

/**
 * One thing a reader can ask to be told about.
 *
 * `says` is written as the reader would say it out loud, first person, because
 * that is how it is chosen: a list of things you want, not a list of
 * permissions you are granting.
 *
 * There is no `needs` field any more and there should not be one again. It
 * existed to mark the things that wanted the addon, and the honest answer
 * turned out to be that no notification can want the addon — see the header.
 */
export type WorldThing = {
  id: string;
  says: string;
  /** The small print, shown under the toggle: what it will and will not say. */
  note: string;
};

export const WORLD_THINGS: WorldThing[] = [
  {
    id: "faire",
    says: "When the Darkmoon Faire moves",
    note: "That it has moved. Never where it went.",
  },
  {
    id: "reset",
    says: "When the week turns over",
    note: "Lockouts, and the quests that go with them.",
  },
  {
    id: "moon",
    says: "When it's a full moon",
    note: "Azeroth's own sky, on Azeroth's own clock.",
  },
  {
    id: "season",
    says: "When a seasonal event opens",
    note: "Winter Veil, Midsummer, Hallow's End.",
  },
];

/** What the reader has asked for. Absent means no — nothing is on by default,
 *  which is rule 5 said in a data shape. */
export type Prefs = Record<string, boolean>;

export function wants(prefs: Prefs, id: string): boolean {
  return prefs[id] === true;
}

/** Read an untrusted object into prefs. The browser sends this, so nothing
 *  downstream may assume a key it did not put there — and a thing removed from
 *  WORLD_THINGS stops being storable the same day, rather than lingering in
 *  somebody's row waiting to fire. */
export function readPrefs(raw: unknown): Prefs {
  if (!raw || typeof raw !== "object") return {};
  const known = new Set(WORLD_THINGS.map((t) => t.id));
  const out: Prefs = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (known.has(k) && typeof v === "boolean") out[k] = v;
  }
  return out;
}

/**
 * The refusal, printed on the card rather than kept in a document — §3.1: a
 * promise the reader cannot see is a promise nobody made.
 *
 * RE-CUT 2026-08-31, and the old line is kept here so the change is visible:
 *
 *   was: "Tari never rings while you're playing."
 *
 * That was conditional on the addon reporting combat and instance state, and
 * the addon reports neither — it cannot, it is a paste. A refusal the product
 * cannot enforce is marketing, and §8 is explicit that a broken promise costs
 * more than one never made. What is left is three things that are all true
 * today, enforced by the list above and by delivery:
 *
 *   - only the world, never this app (rule 1, enforced by WORLD_THINGS)
 *   - never a streak or a count (rule 3, enforced by the same)
 *   - never in the middle of your night (rule 4, enforced at delivery)
 */
export const NEVER = "Only Azeroth. Never Tari, never a streak, and never at 3am.";
