# Carry-over — where whelp plz lands in Tari

Written 2026-08-25. Answers "how do upgrades, errands, trainer etc. come
across". The rule is `TARI.md` §2.1: a feature lives if it makes someone
linger in a place. Whelp plz had five tabs and a zone page. Tari has two
surfaces: **the room** (`/r/[room]`) and **the path** (`/you`). Every old
feature is either a panel in the room, a line in the path, or gone. Nothing
becomes a tab.

## The map

| whelp plz | what it was | Tari | why |
| --- | --- | --- | --- |
| **Upgrades tab** | every upgrade for your class, across all zones, ranked | **"What drops here for you"** — a panel inside the room, filtered to your character | per-place is a reason to go somewhere; across zones is a route (§2.1) |
| **Instances tab** | dungeons ranked by how many upgrades they hold | **the rail** — dungeons are rooms; the upgrade count is a small hint on the rail row and in the adjacency line | the list is Azeroth itself now |
| **Abilities / Train** | spells by level, trainer costs | two places: the path says *"you hit 34, two new ranks"*; the city room's guide has a card *"your trainer is in the Old Town, 3 ranks waiting"* | the trainer is an NPC inside a room, not a table |
| **Errands** | class quests by level and giver | the path says *"a class chain starts in Stranglethorn"*; the room shows the giver as a guide card | says what changed, never where to go (§5) |
| **Attunements** | chains, step by step | each step is a card in the instance room where it's picked up; the path says *"two steps from Onyxia"* | same as errands |
| **Journey / the plan** (`lib/plan.ts`) | one lead card, three moves | **the path** (`/you`). Keep the ranking engine, change the register: a letter, not a plan. It names what changed; it never orders it | §5: "not a to-do list — a letter waiting when you get home" |
| **Character tab + doll** | who you are, what you wear | `/you`'s hero is the doll (`/lab/doll` already renders it); the people column shows the same body small | you are your character |
| **Zone page** `/[cls]/[zone]` | class-specific SEO page with item tables and prose | **the room**. Class-agnostic URL; the character (class, level, faction) is the reader, not the route | `/r/duskwood` is a place. One URL per place, 300 realms in it |
| **Zone prose / facts** | a paragraph per zone | **guide cards**, curated to the 1% (§6). 8–15 per room | magazine, not encyclopedia |
| **Live card + waves** | last few events in a place, one-tap "I saw that" | **"Since you were last here"** (room, §4.3 #2) and the past layer *"137 stood here today"*. The wave becomes the reply to a pin | this is the only thing that makes a known room worth reopening |
| **found / been / wished / equipped / done stores** | ticks, synced per account | keep the tables untouched (additive only). `been` seeds the past layer; `equipped` + `found` shrink the loot panel; `wished` is the panel's private filter; `done` drives the path | already flowing; the event log never stopped |
| **Addon paste** (`lib/import.ts`) | reads the WP2 export | the client (§9) reads the file automatically; the paste field stays on `/you` for the web | most valuable file in the repo, unchanged |
| **Gear roll** | invents a plausible outfit | keep for the doll's empty state only | the only place that invents anything |
| **Faction ask / start zone** | which side, where you woke up | one question on first sign-in, stored on `users` | fine |
| **SEO schema, breadcrumbs, per-class OG** | 441 static pages | gone. One OG card per room, the room's photograph | Tari is not a search product during the window |
| **Roadmap modal, feedback** | | feedback stays (`/api/feedback` exists); the roadmap is TARI.md | |

## The one structural change

Whelp plz's data was **441 files: one per zone per class.** The page was
the class. Tari's room is class-agnostic and the *reader* is the class, so
the data has to be reshaped once:

```
room      id, kind, name, band, art, adjacency
entry     room, kind (item | quest | npc | landmark | step), level band, data
```

The room fetches its entries once (RSC, cached). The character filters them
on the client: *this drops here for you*, *this trainer has ranks for you*.
That is the CPLUS pipeline emitting by room instead of by class-and-zone.
Everything else in the mapping falls out of that table.

## The room, in build order

§4.3 lists seven things on the page. Build them in this order because each
one is usable without the next:

1. **Art + title + adjacency line.** Exists in the shell already.
2. **The framed map.** Exists (`/lab/map`, EPL). Move it into the room.
3. **What drops here for you.** The loot panel. Data exists; reshape it.
4. **The guide + spoiler shield.** 8–15 cards. Needs the scrape → curate
   step from §6.2 for *one* room. Do it by hand for the first room.
5. **Since you were last here.** Reads `events` for this place. Exists.
6. **Pins.** §14 step 6. The atom. Only after 1–5 are on one screen.
7. **Presence + cursors.** §14 step 7. Liveblocks.

Then the path (`/you`), which is `lib/plan.ts` with the sentences rewritten.

## Which room first

Cities are the presence showcase, dungeons the guide showcase (§4.1). A
zone is the honest first pick because it has all seven things: a map with
pins, drops, a trainer nearby, a chain that starts there, and a level band
that makes the "at 24" filter mean something. **Duskwood** is the one every
doc already uses as the example. Eastern Plaguelands is the one with a
working map. Either; pick one and do not do two.
