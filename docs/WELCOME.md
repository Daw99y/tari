# Tari — the welcome

The onboarding, the nudge, Rested, the almanac and the follow. Drafted
2026-08-30 with Kacey; **reconciled against the repo the same day, after the
two-deck work landed.**

**This is §14 step 11 finishing, not a new step.** `lib/path.ts` and the letter
on `/you` are the path's first organ — the journey half of §5, already shipped.
Everything here is the rest of the same organ: the one surface that is about
*you*, and the counterweight to the room.

Companion docs: `TARI.md` holds the argument, `STATUS.md` holds the state,
`DESIGN.md` holds the vocabulary, `PINS.md` holds the atom. This one holds the
welcome.

> **Reconciliation note.** The first draft of this document was written against
> `STATUS.md` as of 08-26 and was wrong in three places within hours. **The
> rares are built** (`form: "six"`), **the seed mechanism is built and empty**
> (`seedWho`, `Seed`, `seeds: null`), and **the unwritten room is solved**
> (DESIGN.md, *The unwritten room — settled 2026-08-30*). §6, §2 and §10 are
> rewritten to match. STATUS.md has not been updated since 08-26 and is now the
> stalest doc in the repo.

---

## 0. The rule

§13 refused notifications, streaks and followers. All three are wanted now.
They are not a reversal, because every mechanic §13 refused was refused for the
same reason: **the reward lived inside the product.**

> **If it brings you back to Tari, it does not get built.
> If it sends you back into the world, it does.**

One line, and it survives every feature in this document. It also explains
itself, which six refusals never did.

### 0.1 The test, restated

§2.1 asks whether a feature makes someone linger or move faster. This document
adds the second half of the same question:

| | |
| --- | --- |
| a notification about something happening in Azeroth | ✅ |
| a notification about something happening in Tari | ❌ |
| a number that records what you did | ✅ |
| a number that threatens you with what you'll lose | ❌ |
| following a person whose pins you want to stand in | ✅ |
| a count of who follows you | ❌ |

---

## 1. The kit — built, 2026-08-30

`app/(app)/kit/` · `lib/kit.ts` · `reference/kit.json` · `Kit` in the rail head.
Dealt as the deck's third use (DESIGN.md, *The kit*). It stands on a
photograph but never on a room — the kit is about the reader rather than a
place, so the art is a still life; `RLextras/wishlist.webp` holds the spot. The copy below is what shipped, and it is Kacey's to redline.

**Not a tutorial. A packing list.** The first letter Tari writes to you, before
you have done anything.

Cards, not steps. **No progress bar, no "3 of 5", no completion state** (§4.2).
Every card is skippable, and the kit stays reachable forever — it is a page you
can come back to, not a wizard you get through once.

The register is hints and nods. A friend who has played this before, telling
you what they wish they'd carried. Never an instruction.

### 1.0 Before the kit — who you are

Two doors now, not one. The addon (`docs/CHARACTER.md`) and **the armory
import** (`app/api/armory/route.ts`, `lib/bnet.ts` — Battle.net Classic profile
lookup, landed 08-30). The armory door is the one a stranger can walk through
in ten seconds with no download, which makes it the welcome's front door and
the addon the thing you're invited to later.

**The welcome must not require the addon.** Everything in §3 that depends on it
degrades to the envelope.

### 1.1 Things to carry

> **A fishing pole.**
> Cheap, any trade goods vendor. Every lake in the world becomes somewhere to
> sit for ten minutes. We'll say something when you're near water worth
> sitting at.

> **Bait, and the patience to use it.**

> **One empty bag slot.**
> For the thing you keep because it's strange, not because it sells.

> **A hearthstone set somewhere you like.**
> Not the fastest inn. The one you'd want to wake up in.

> **A white shirt.**
> You'll want it eventually.

> **Somewhere to sit.**
> A campfire counts.

### 1.2 Things to do with them

> **A lap.**
> Every zone has rares walking it. They aren't likelier to drop anything good —
> that's the point. Kill two or three on a slow circuit and one of them hands
> you something you'd never have known existed. The upgrade isn't the reward.
> The afternoon is.

> **The quest text.**
> Twelve murlocs is twelve murlocs either way. Reading why takes forty seconds,
> and it's the difference between playing Azeroth and clearing it.

The lap card points at a surface that already exists — see §6.

### 1.2a The other screen

The one card that explains Tari rather than Azeroth, and it earns the exception
because it is the argument for everything else in the kit. `TARI.md` §2.3 is
the doctrine; this is how it is said to a stranger.

> **The other screen.**
> This doesn't run inside the game, on purpose. An addon sits in the corner of
> your eye and you follow it without ever taking your hands off the keys —
> which is how people arrive at 60 having seen nothing. Tari costs you a look
> away. That second, where your character is standing still in the world while
> you read something, is the whole product.

> **The addon only listens.**
> It tells Tari where you're standing. Tari never tells you where to go.

**Say it early.** A reader who thinks the second monitor is a limitation
Tari has not gotten around to fixing yet will read every other card as a
workaround. A reader who has been told the distance is deliberate reads the
same cards as a position. It is the difference between an unfinished product
and an opinionated one, and it costs two sentences.

### 1.3 What the kit is actually doing

Three jobs, none of them announced:

1. **It teaches the thesis by suggesting behaviour, never by explaining
   product.** Nothing in the kit describes a feature of Tari.
2. **It collects notification permission as a choice about the world.** You
   pick from the kit — *remind me to fish · tell me when the Faire moves · tell
   me when it's a full moon* — and the OS prompt arrives attached to something
   you asked for. See §3.
3. **It ends in giving, not consuming.** See §2.

---

## 2. The seeds, and the first pin

### 2.1 Built, 2026-08-30

**A seed is a real pin from Tari.** `lib/guide.ts`'s `Card.seed` was not the
answer — it hangs off a card, cards come from a guide file, and seventy-seven
rooms have none. So the seed became a row in `pins` instead. `docs/PINS.md`
carries the shape and the four refusals that keep it from being an invented
player (`cls` is `tari` and not a class; `level` is 0; the pin is spotless).

- `reference/seeds.json` — thirty-five rooms, the six cities and everything
  banded at 30 or below. **Kacey's copy to redline.**
- `scripts/seed-pins.mjs` — plants them, idempotent, `--dry` writes nothing.
  Run from Kacey's terminal; the bridge has no egress to Neon.

### 2.2 Why this was the most load-bearing empty field in the repo

DESIGN.md settled *The unwritten room* on 08-30: a room with no guide file
draws the deck of what people left, and **a written room and an unwritten one
are the same object.** That is a genuinely excellent decision and it changes the
launch arithmetic completely — but it moves the product's whole substance onto
pins, and seventy-seven rooms would have opened holding nothing.

An empty deck is honest. Seventy-seven of them is a launch.

The seed also teaches by example — it is the only place a new reader sees what
a good pin looks like before writing one, and it does that without inventing a
player.

**The tension, recorded.** DESIGN.md says the empty deck "invents nothing, and
no lore, ever." A seed is Tari saying something, which is not nothing. The
ruling that reconciles them: **a seed is signed.** The empty state still
invents nothing; a seed is not the empty state, it is the app taking a turn
under its own name, and the reader can see whose turn it was.

### 2.3 The first pin

**The last beat of the welcome is leaving a pin, not reading one.**

> Leave something for the next person who stands here.

The composer already stands *in* the deck (PINS.md), so this beat needs no new
surface — it needs the welcome to end by putting the reader in front of it.

The right emotional note — the first thing you do in Tari is for somebody else
— and simultaneously the seeding strategy that keeps every room from being
seeded by Tari alone.

---

## 3. The nudge

### 3.1 The refusal, re-cut 2026-08-31

It used to read, word for word:

> ~~**Tari never rings while you're playing.**~~

**It came off, because it is not true and cannot be made true.** Kacey,
2026-08-31: **the addon cannot read live state — not combat, not instance, not
position, not anything.** It writes an export string a reader copies out of the
game and pastes in (`docs/CHARACTER.md`, TA2). The armory answers as of last
logout and says so. **Both are photographs, taken when somebody decides to take
one.** Nothing in this product knows you are playing right now, so a promise to
go quiet while you are is marketing — and §8 is explicit that a broken promise
costs more than one never made.

This settles open ruling §11.2 as **no**, and it deletes a feature: *"when I'm
near water you've never sat at"* was the best line on the list and it is a lie,
so it is gone rather than parked. A toggle that can never fire is worse than an
absent feature — the reader ticks it, waits, and learns the app makes things
up. **The kit's fishing card carried the same promise** and is re-cut too
(`reference/kit.json`, `pole`: the second line is now *"Nobody has ever
regretted the ten minutes."*).

What replaced it is three things this product can keep, enforced by the list in
§3.2a rather than by intention:

> **Only Azeroth. Never Tari, never a streak, and never at 3am.**

**The upside of losing the addon condition is large:** the nudge now works for
everybody — signed out, nothing installed, on a borrowed laptop. §1.0's
"armory-only readers get the correct degradation" is moot, because there is no
longer anything to degrade.

### 3.2 The rules, as a testable list

1. **Only about Azeroth, never about Tari.** "The Faire leaves Elwynn on
   Sunday" ✅. "Someone replied to your pin" ❌ — that waits in the envelope.
   "You haven't opened Tari in three days" ❌, permanently.
2. **No direction.** "You're near water you've never sat at" is a pin.
   "Crystal Lake, 340 yards, this way" is RestedXP. §2.1 is not suspended
   because the message arrives by push.
3. **Nothing defends a streak.** No notification may reference Rested, the
   almanac, or any count. This is the line that keeps §0 true.
4. **Quiet hours are load-bearing.** Cross-region product. Nothing fires at 3am
   in Perth.
5. **Per-thing opt-in, chosen in the kit.** Never a blanket permission.
6. **It must be knowable without the reader** — added 2026-08-31, and it is the
   rule §3.1 was rewritten around. If answering it needs a client that is
   running, a position, a combat state, or anything else nothing in this
   product can see, it does not go on the list.

### 3.2a The list, as built

`lib/nudge.ts`, `WORLD_THINGS`. Four things, and every one is a fact about
Azeroth on a calendar: no addon, no armory, no client, no reader input, the
same for everybody in a region, computable months ahead.

| thing | says | and never says |
| --- | --- | --- |
| `faire` | When the Darkmoon Faire moves | where it went |
| `reset` | When the week turns over | what to do with it |
| `moon` | When it's a full moon | — |
| `season` | When a seasonal event opens | — |

Adding a fifth means answering rule 6 in that file, in writing.

### 3.3 Two channels

| channel | behaviour |
| --- | --- |
| **the envelope** | in-app, silent, waits to be looked at. WoW's mail icon is the softest notification ever designed. Everything about Tari lands here. |
| **push** | rare, world-only, opt-in per thing. Everything about Azeroth may land here. |

Push delivery wants the Tauri client (§14 step 8) — native notifications are
trivial there and web push on iOS is misery.

### 3.4 The third thing, and it is already built

`Moments.tsx` (08-30) is the opposite primitive and belongs in the same
sentence as the other two: **a mark that crosses every screen and is gone in
three seconds. No history, no count, nothing to scroll.**

| | recorded | interrupts |
| --- | --- | --- |
| **a moment** | never | nobody — it is already where you're looking |
| **the envelope** | yes | never |
| **push** | yes | only when you are not playing |

Three channels, no overlap. Nothing else gets added.

---

## 4. Rested — built, 2026-08-31

`lib/rested.ts` · `app/api/rested/route.ts` · `app/(app)/Rested.tsx`,
in the people column over the doors · the cursor is a `been` mark. The room's
surface is built and `STATUS.md` §0 has what it cost; the letter's half of it
is untouched (§11.5). The copy below is what shipped, and it is Kacey's to
redline.

The §7 inversion applied to the growth mechanic.

The problem with a streak is not the counting. It is the **breaking** — the
number's whole job is to threaten you. So invert it: **time away accrues.**

> **Duskwood · at 24 · well rested**
> Nine days. Fourteen people came through at your level. Someone answered your
> question about Stalvan. Two new pins near Raven Hill.

**The longer you are gone, the better the homecoming reads.** A daily user gets
"three people came through"; a fortnightly one gets a letter. This is the exact
inverse of every engagement system, and it is one query change — "since you were
last here" is already §4.2 and already called Tari's line.

### 4.1 The two rules that keep §7.1 true

§7.1: *the moment a Rested badge is earned, it is a streak in a costume.*
Rested survives that because it is not earned by activity. To keep it that way:

1. **It is never a bar filling in real time.** No progress, no anticipation.
2. **It is never spent.** The moment it is a currency you save up, §7.1 is dead
   and so is §13.

---

## 5. The almanac

What accumulates underneath Rested. The spine of the journal planned in
`CHARACTER.md`.

### 5.1 Admission criterion

> **Only things that cannot be repeated.**

Not "you fished 40 times" — *you were in Moonglade for the Lunar Festival,
2026.* If it can be farmed, it is a point, and §13 refuses points.

| source | entries | state |
| --- | --- | --- |
| the calendar | Faire, Winter Veil, Midsummer, Hallow's End, full moons | not modelled |
| the event log (§14 step 2) | first time in a room; first pin in a room nobody had pinned | running |
| the world | you were in Silithus the week it opened | not modelled |
| rares | **met** — your first meeting with each | **data exists**, see §6 |

### 5.2 The rule that keeps it from being a checklist

> **It shows what you have. It never renders what you haven't.**

No greyed slots. No "3 of 12 seasonal events." An empty almanac is a new
character, not a failure — the same logic as *The unwritten room*. Five of six
greyed out is a checklist; five names you collected is a memory.

### 5.3 Why it matters to §7

The almanac is what makes following worth anything. You follow someone and see
they were at the Faire in Mulgore in March. That is a person with a history in a
world, not a profile with a number.

---

## 6. The rares — built, 2026-08-30

**This section is a record, not a proposal.** The lap already has a surface.

`reference/guide/duskwood.json` carries a `rares` array — six named things, each
with an icon, two lines, and a `t`. `lib/guide.ts` defines the card form:

```
six: the rares' roll-call; the diamonds answer for themselves
```

and the card reads:

> **The six** · *Named things on long timers*
> Each holds a fixed haunt. Press a diamond.

That is exactly right, and it already honours the rule the proposal was going to
argue for:

> **Show that they exist. Never show where they are.**

`t` is a position along **the telling's road**, not a map coordinate. That
distinction is the whole safety margin and it should be written down somewhere
it cannot be lost: *a rare's `t` is a place in a story, not a place on a map.*
The day a rare gets an `x`/`y` the product has shipped a farming route.

### 6.1 What is still missing

1. **`rares` exists only in Duskwood.** Undercity has none, correctly — a city
   has no lap. But it is per-room content, so it is on the scrape (§9).
2. **The almanac's "met"** has nowhere to be recorded yet. Entry type **met**,
   not killed — §7's register.
3. **The nudge form**, which wants "what closes" (§4.3, item 4) pointed at the
   roll-call:
   > **You're 24. Hillsbrad stops being worth your time around 30.
   > Six rares walk it. You've met one.**
   The one kind of urgency that makes a player go slower, containing no arrow.
4. **The kit card** (§1.2), which is the only thing that tells a new reader the
   lap is a thing people do.

---

## 7. The follow — built, 2026-08-31

`lib/follow.ts` · `app/api/follow/route.ts` · the flag rides `lib/pins-db.ts`.
**The refusal is written as a missing index**: `db/schema.sql` has no index on
`follows.followed`, because an index that way round exists only to count or
list the people following somebody. The comment there says so, so adding it
later cannot happen by accident. There is no `countFollowers` for anything to
call, no route that returns who follows you, and no list of who you follow —
the whole surface is one boolean on the pins a room was already reading.

The value is the feed. The poison is the number.

> **You can follow. Nothing is counted.**

No follower total exists anywhere in the product — not publicly, not privately,
not to the person being followed. §13's "no number that only goes up" survives
completely intact. PINS.md already refuses "pin count badges on the rail"; this
is the same ruling one level up.

The lore does the work: **`/follow` in WoW means you stop steering and let
someone else lead you through a place.** That is the thesis in a slash command.

**Place-first, never timeline-first.** You follow someone because of a pin in
Duskwood, and the payoff is their pins surfacing in the rooms *you* walk into.
Never a chronological feed of their posts — that is an infinite scroll wearing a
friend's face, and §13 refuses it.

---

## 8. The refusals, re-cut

`app/(site)/page.tsx`, `REFUSALS` — **verified unchanged as of 08-30.** Still
the original six, three of which this document falsifies.

Same six lines, same glyph, every line re-cut to describe a **property** rather
than a feature, so future work does not falsify the landing page:

```
Nothing here rings while you're in a dungeon.
Nothing here punishes a week off.
Nothing here ends only when you close the tab.
Nothing here ranks you against anyone.
Nothing here is a number that only goes up.
Nothing here tells you where to go.
```

| line | survives because |
| --- | --- |
| rings while you're in a dungeon | §3.1 — the addon suppresses and queues |
| punishes a week off | §4 — absence is the thing that pays |
| ends only when you close the tab | unchanged, no infinite scroll |
| ranks you against anyone | **conditional — see below** |
| a number that only goes up | §7 — no counts exist |
| tells you where to go | §3.2 rule 2, and §6's `t` ruling |

### 8.1 The leaderboard ruling

"No leaderboards. Nobody wins Tari." must come off the page **now**, not when a
leaderboard ships. A promise broken costs more than one never made.

The replacement line keeps its value for free **if future leaderboards rank
places, not players.** "Nobody has been to the Stockade in three weeks" ranks a
room. Then *nothing here ranks you against anyone* stays true forever.

**Ruled 2026-08-31: places, never players.** So the line stays on the landing
page exactly as written, and it stays true for free. Any leaderboard this
product ever ships ranks rooms — *"nobody has been to the Stockade in three
weeks"*, *"137 stood in Ironforge today"*. **A ranking of players is now a
thing this document forbids**, not a thing it is waiting on.

---

## 9. What this needs from the scrape

Three fields, cheap on a pass being made anyway and expensive to bolt on after:

| field | feeds | state |
| --- | --- | --- |
| **rares per room** — names, icons, lines, road `t`; nothing positional | §6 | **shape proved in Duskwood**, needs the other rooms |
| **water per room** — one boolean | §1.1, the fishing nudge, entirely | not started |
| **calendar bindings** — which room hosts which seasonal event | §5.1 | not started |

Add a fourth now that the seeds matter:

| **one to three seed pins per room** — a sentence each, signed Tari | §2 | `seedWho` set, `seeds: null` |

---

## 10. §14, re-cut

The build order under-reports the product badly. Three corrections.

**A limb grew that the list does not have.** The creator, the roster, the addon,
the armory import, the sheet, the doll, the lab and the dressing room appear
nowhere in the twelve steps. The character layer is a third pillar beside the
room and the path, and §14 should say so.

**Step 10 is written as a monolith and is no longer the path to launch.** Its
two halves have nothing in common: scrape-and-curate is fast; **the shoot is one
person, in-game, at the right hour, across seventy-nine rooms**, and it does not
compress.

**And the two-deck work demoted it.** Before *The unwritten room*, a room with
no guide file read as a loading screen, which made guide files launch-blocking
for the old world. They are not any more — a written room and an unwritten one
are the same object. **Guide files went from blocker to enrichment in one
commit.**

### 10.1 What that costs

The same decision that freed the launch from step 10 **put the whole launch on
pins.** Seventy-seven rooms open holding a deck of what people left, and on day
one nobody has left anything. So:

> **The welcome is not the thing after the content. It is the content
> strategy.**

Which makes the order:

1. ~~A dungeon and a raid.~~ **Done 2026-08-30** — Shadowfang Keep and
   Zul'Gurub. All four room kinds are proved and the format held; what it cost
   was making the telling work without a map, and letting a card stand with no
   object. Both were structural, not editorial, which is the good outcome.
2. **The seeds** (§2.2). Every room, one to three sentences, signed Tari. An
   evening, and no room opens empty.
3. **The welcome** (§1–§5). Small next to seventy-seven rooms, and it is what
   turns a seeded deck into a written one.
4. **Ship.** §0.3 is the only unrecoverable mistake in the product.
5. **Guide files forever after**, in whatever order rooms get busy.

### 10.2 The corrected position

| step | state |
| --- | --- |
| 1 repo split | done, 23rd |
| 2 event log | running |
| 3 landing page | done; rebuilt playful 08-30; §8 outstanding |
| 4 one room to 15/10 | done, and twice over |
| 5 design.md v2 | done; rewritten 08-30 |
| 6 pins | done; spotless pins added 08-30 |
| 7 presence + cursors | done, 26th; moments added 08-30 |
| 8 Tauri client | not started — gates push (§3.3) |
| 9 the wake | effectively done inside the room |
| 10a scrape / curate / shot list | in progress |
| 10b the shoot | **no longer launch-blocking** — see §10 |
| 11 the path | in progress — the letter shipped; this document is the rest |
| 12 the atlas | downstream of 10a |
| — the character layer | shipped, unlisted |
| — the two decks / the unwritten room | shipped 08-30, unlisted, and it moved the launch |
| — the kit / the seeds / Rested | §1, §2, §4 — three of the welcome's five, shipped |
| — the nudge | §3 — the opt-in, the list and the envelope shipped 08-31 |
| — the follow | §7 — shipped 08-31 |
| — the almanac | §5 — the one piece of the welcome still unbuilt |

---

## 11. Open

1. ~~The leaderboard ruling.~~ **Ruled 2026-08-31: places, never players**
   (§8.1). The landing line stays and is now permanent.
2. ~~Does the addon report combat and instance state today?~~ **No, and it
   cannot** — 2026-08-31. It reads nothing live at all. §3.1 is re-cut, one
   thing was deleted from the list, and the kit's fishing card was corrected.
3. ~~Push before or after Tauri.~~ **Ruled 2026-08-31: neither, yet.** The
   opt-in and the choosing ship now and everything lands in the envelope; push
   is a delivery swap later rather than a second feature, so §3 is unblocked
   without waiting on step 8.
4. ~~Where the kit lives after first run.~~ **Settled: its own route**, in the
   deck's grammar, linked from the rail head for good (2026-08-30).
   Still open under it: whether the creator hands a new reader to `/kit`
   automatically on Accept, or whether the rail link is the only door.
5. **Whether Rested also speaks in the letter.** Half-settled 08-31: it is
   built in the room's people column, at the foot of it and over the doors,
   per TARI.md §4.3 band 2 — the word said only in its heading, no badge and
   no threshold. Whether the letter on `/campfire` carries it too is still
   open.
6. ~~`STATUS.md` has not been updated since 08-26.~~ **Caught up 08-31.** Its
   §0 now carries Rested and the landing rebuild, and §0.02–§0.05 the path and
   wave 5. It went stale twice in one day even so — §0 was written at 03:43
   and two landing commits landed after it. It is the doc every session is
   told to read first; **check its Updated line against `.git/logs/HEAD`
   before trusting it.**
