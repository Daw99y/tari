# Tari — the new direction

Written 2026-09-08 with Kacey, four days out from BlizzCon. **This supersedes
`TARI.md` §2 and §13, and every refusal in `WELCOME.md`.** `TARI.md` §0, the
window, survives untouched and is promoted to the headline.

---

## 0. What changed

The old doctrine was a set of refusals. They were written to stop Tari becoming
Wowhead, and they worked. They also forbade most of what makes a second-monitor
app get downloaded, and they were enforced by a session rule (`START-HERE` rule
7, *"Direction is settled. Hold it steady, do not reopen it"*) that made every
Claude session argue with Kacey instead of helping him move.

**Rule 7 is dead. So is every refusal.** Kacey's ruling, 2026-09-08:

> Tari is a social, levelling, fun, companion, guide, database, comments, chat
> second-monitor app for Classic+. It is not a bunch of rooms with live chat.

The rooms do not go away. They stop being the product and become the chassis.

### 0.1 What was actually wrong with the refusals

Not the taste. The taste was good and most of it survives as *default
behaviour*. What was wrong was making it **law**, because a law cannot be
A/B tested, cannot be a user setting, and cannot be revisited when the market
moves. Six lines on a landing page committed the product to never shipping
notifications, never ranking anything, and never telling anyone where to go,
in a category where the incumbent has 25.5 million downloads for doing exactly
those three things.

Taste belongs in defaults. It does not belong in refusals.

---

## 1. The statement, in three beats

The landing page does these in order as it scrolls. So does any Reddit post.

**Beat one, the hook: the window.** `TARI.md` §0, unchanged.

> Day one of Classic+, Wowhead has no data. Every RestedXP waypoint is a lie.
> Questie has no coordinates. Sixtyupgrades has no items. Every tool in the
> category is dead on arrival for weeks, and the only source of knowledge in
> the world is other players, discovering things in real time, telling each
> other. Tari is where that lands.

**Beat two, the value: the second monitor.**

> Tari knows your character and it knows the zone you are in. Everything it
> shows you is already filtered by those two facts. What drops here for you.
> What quests are here. What people wrote here. Where to go next, at the pace
> you set.

**Beat three, the reveal: one world.**

> Classic fragments Azeroth into fifty islands. Your Duskwood and a stranger's
> Duskwood are the same Duskwood on Tari. Cross-realm, cross-region, live.

Beat one wins the launch. Beat two is why it survives the launch. Beat three is
the thing nobody else can copy.

---

## 2. The rules

Nine. They replace the six refusals and `WELCOME.md` §0.

1. **Here, for me, now.** Every surface answers at least one of: where I am,
   who I am, what is happening right now. A screen that answers none of the
   three needs a written reason to exist.
2. **The player sets the pace. The app never does.** Rush, Normal, Soak. One
   dataset, three itineraries. Tari has no opinion about how fast anyone plays
   and ships no copy that implies one.
3. **It may ring, and the player decides what for.** Every notification type is
   a toggle, defaults moderate, no editorial refusals. The one piece of manners
   that survives from `lib/nudge.ts`: **a toggle that can never fire never
   ships.** A reader who ticks a box, waits, and gets nothing has learned the
   app makes things up.
4. **Ranking is allowed.** Players, guilds, realms, places. First to 60, first
   clear, first legendary, most zones walked. *"Nothing here ranks you against
   anyone"* comes off the landing page.
5. **Never make the player alt-tab to act.** Anything actionable ships as a
   copyable macro, a waypoint the addon can eat, or it does not ship.
6. **The crowd outranks the pipeline.** For Classic+ content, where the
   database and a player disagree, the player wins and the disagreement stays
   visible. The pipeline is authoritative for the old world only.
7. **Vanilla 1.12 for the old world.** Unchanged. The most confident-sounding
   lore is usually the Cataclysm retcon.
8. **Additive schema only.** Unchanged. Never rename tables.
9. **Never show a reader a fact the client did not give us.** Added
   2026-09-08 after the live spike (§4.4). A live indicator that is quietly
   wrong costs more than an absent one, the same way an unfireable toggle does.

### 2.1 What happened to each old rule

| old | now |
| --- | --- |
| §0 if it brings you back to Tari it does not get built | **dead.** Bringing people back is the goal. |
| §3.1 Tari never rings while you're playing | **dead**, replaced by rule 3. |
| §3.2 the six nudge rules | **dead** except *knowable without the reader*, which is now rule 3's second half. |
| §4.1 Rested never fills, never spent | **dead as law, kept as a feature.** Rested ships alongside streaks, not instead of them. |
| §5.2 the almanac never renders what you haven't | **dead as law, kept as a default.** Greyed slots are now a design call per surface. |
| §7 you can follow, nothing is counted | **dead.** Follower counts, pin counts and contributor reputation all ship. |
| §8 the six refusals | **all six off the page.** Replaced by §1's three beats. |
| §8.1 leaderboards rank places not players | **overturned.** Rule 4. |
| `START-HERE` 7 direction is settled | **dead.** It is why this document took three weeks to get written. |
| a rare's `t` is never a map coordinate | **dead.** Rush mode needs coordinates. Soak mode is where `t` survives, as a mode, not a law. |
| every other `START-HERE` rule (1-6, 8-9, 11) | **survives.** They are operational, not philosophical. |

---

## 3. The shape

Settled 2026-09-08.

**Two shells, from day one, one codebase.** Web for reach, sharing and the
ten-second armory front door. Desktop (Tauri) for the live layer and native
notifications. Neither is second class and there is no migration later.

**The home screen is a dashboard of three**, not a room. One screen, three
columns, no navigation for the common case:

| column | answers | source |
| --- | --- | --- |
| **where you are** | quests here, drops here for your class and level, comments here, who is here, the route through here at your pace. Defaults to last session's final zone, one click to change (§4.1) | CPLUS zone emissions + Ably + pins |
| **who you are** | sheet, level, upgrades, guild, almanac, what to do next | armory + addon + `lib/upgrade.ts` |
| **what is happening** | Classic+ news, realm firsts, replies, people you follow, guild recruitment | feed, new |

The room is what the first column becomes when you open it.

**Indexed pages: zones now, items later.** 79 room URLs Google can see, each
with the zone's data, its comments and its live presence. Item and quest detail
pages stay inside the app until after the launch rush, with the schema shaped so
they can be switched on without a migration.

---

## 4. The live signal, settled 2026-09-08

The spike ran the same day this document was written. `docs/LIVE-CLIENT.md`
holds the raw lines and the size-over-time table.

> **Zone is derivable, exactly and by name. The file is not live.**

`ZONE_CHANGE` and `MAP_CHANGE` fire on every border crossing, out of combat,
with the zone as a string and a stable numeric map id beside it, and the
character and realm named outright on every combat line. And nothing reaches
disk while you play: 274 bytes for fourteen minutes, then 16,681 the moment the
session ended. The client buffers in memory and flushes on logout.

So `STATUS.md` §0's ruling survives, for a better reason than the one it gave.
It is not that the client fails to record where a reader is standing. It records
it precisely. **It just does not hand it over while they are still playing.**

### 4.1 What that kills

- **Tari cannot mirror where a reader is standing, and the search stops here.**
  There is no sanctioned live file channel for a solo player. Do not reopen this.
- **The Tauri client does not move to the top of the build order.** It stays
  roughly where §14 put it.
- **§3's "where you are" column cannot auto-detect.** It defaults to the last
  zone of the last session and is one click to change. A good default plus a
  click is a fine product. A live indicator that is quietly wrong is a broken one.

### 4.2 What it hands over instead, which is worth more than expected

The logout flush is a complete, ordered, structured record of a play session.
Every zone entered with a timestamp, every kill, every death, identity on every
line. **No paste, no copy, no export string, no reader effort at all.**

The desktop client's job therefore changes from **mirror** to **journal**. It
watches the folder, and when a session ends it imports the whole thing.

That feeds four things, three of which are already designed:

| feeds | how |
| --- | --- |
| the almanac (`WELCOME` §5) | real entries with timestamps that were not invented |
| Rested (`WELCOME` §4) | a real *since you were last here*, computed rather than guessed |
| the path (`lib/path.ts`) | the route actually walked, not an inferred one |
| the feed (§3) | its day-one content problem. A session that just ended is news. |

### 4.3 The three things that will bite the parser

1. **Debounce.** Riding out of Orgrimmar produced four `ZONE_CHANGE` lines in
   850ms. A crossing is not an arrival.
2. **`MAP_CHANGE` is sometimes a continent.** Trust `ZONE_CHANGE`; use the map
   id as a lookup key, never as the zone.
3. **No combat means no file.** A logged-in player who has not fought may have
   nothing on disk at all. File presence can never be a liveness check.

### 4.4 The rule this earns

Rule 9, added to §2:

> **Never show a reader a fact the client did not give us.** A live indicator
> that is quietly wrong costs more than an absent one, the same way an
> unfireable toggle does.

## 5. The roadmap

BlizzCon is **12-13 September**. The panel is the **Classic Game Deep Dive,
Sat 15:30 PDT = Sunday 13th, 06:30 Perth.**

### Tomorrow, Wednesday 9th

| | |
| --- | --- |
| morning, 2h | **the combat log spike** (§4). Nothing else until it is written down. |
| midday, 2h | **rewrite the docs.** `TARI.md` §2 and §13 rewritten to §1 and §2 of this file. `WELCOME.md` refusals struck. `START-HERE` rule 7 deleted, rules replaced. `app/(site)/page.tsx` `REFUSALS` array emptied. |
| afternoon | **start `/classicplus`.** Not `/blizzcon`. Name it for the thing that lasts. |

### Thursday 10th to Friday 11th

- Finish `/classicplus`. It is a room like any other: presence, chat, cursors,
  moments, one deck, one Tari-signed seed. The primitive is generic and the
  unwritten room is already solved, so this is a day, not a week.
- Indexed zone pages for the fifteen told rooms. Zone data from CPLUS, comments,
  presence count. Enough for Google to see something.
- Draft the r/classicwow post. Its entire value proposition is the panel
  schedule in Perth, US and EU times, plus a link to a room to watch it in.

### Saturday 12th

Post it. One post, the schedule table, *watch the Classic panel with everyone.*

### Sunday 13th, 06:30

Be in the room. Whatever is announced, the room is where it is processed, and
it is already the busiest thing Tari has ever had in it.

### After, three branches

| Blizzard says | Tari does |
| --- | --- |
| **Classic+ with a date** | `/classicplus` becomes the countdown and the hub. Everything in §3 gets built against a known deadline, and `TARI.md` §0.3 (*being late to the window is the only unrecoverable mistake*) becomes the only thing that matters. |
| **Classic+ for 2027** | The room becomes the waiting room and **the waiting is the content.** Six months of runway with an audience already assembled, which is better for Tari than two weeks. Build the dashboard, the client, the pace modes and the comment layer properly, and write the other sixty-four rooms with people watching. |
| **nothing** | It is where everyone processes that together. Tari ships against Era, Hardcore, Anniversary and TBC, which it already works on, and the window argument waits for its turn. |

### The build order after BlizzCon, in order

1. The three-column dashboard. It is the product now, not the room.
2. Pace modes on the CPLUS journey data. Rush first, because Rush is the one
   that takes RestedXP's users, and Soak is the one that keeps them.
3. Comments everywhere, with reputation. Rule 4 is now allowed, so use it.
4. The feed: realm firsts off the armory, news, follows.
5. **The journal importer** (§4.2), as a desktop client. Not launch-blocking,
   and worth more once there are rooms and an almanac for it to fill.
6. The remaining sixty-four rooms, forever, in whatever order they get busy.

---

## 6. Still open

1. **Moderation.** Rule 4 and a public comment layer make this a real job before
   launch, not after. Nobody has thought about it yet.
2. **What the feed does on day one**, when there are no realm firsts because
   there are no realms.
3. **Whether Rush mode ships with coordinates Tari authored or waypoints the
   addon eats.** Different legal and effort profiles.
5. **Whether the journal importer replaces the addon paste or sits beside it.**
   The paste still carries bags, professions, talents and gold, which the
   combat log never will.
4. **`STATUS.md` is 64k and last updated 31 August.** It is the doc every
   session reads first and it now describes a product that no longer exists.
