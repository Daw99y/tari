# Carry-over — where whelp plz lands in Tari

Written 2026-08-25. **Trainer, attunements, errands and journey were built on
2026-08-31 — see §The path, below. The table's rulings held; what changed is
that they landed on their own page rather than inside the room.** Answers "how do upgrades, errands, trainer etc. come
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
| **found / been / wished / equipped / done stores** | ticks, synced per account | keep the tables untouched (additive only). `been` seeds the past layer; `equipped` + `found` shrink the loot panel; `wished` is the panel's private filter; `done` drives the path | already flowing; the event log never stopped. **`equip` is written by the dressing room as of 2026-08-26** (docs/DRESSING.md): subject is the gear index, `val` the item id, laid over the import and never into it |
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
7. **Presence + cursors.** §14 step 7. Ably — built 2026-08-26, with
   chat, typing, room reactions and the occupancy roll-up beside them.

Then the path (`/you`), which is `lib/plan.ts` with the sentences rewritten.

## Which room first

Cities are the presence showcase, dungeons the guide showcase (§4.1). A
zone is the honest first pick because it has all seven things: a map with
pins, drops, a trainer nearby, a chain that starts there, and a level band
that makes the "at 24" filter mean something. **Duskwood** is the one every
doc already uses as the example. Eastern Plaguelands is the one with a
working map. Either; pick one and do not do two.


## The path, built 2026-08-31

The four reader-facing tabs — Journey, Trainer, Attunements, Errands — are one
page at **`/path`**, and the letter that used to sit under the name on `/you`
moved there with them. `/you` is the paperdoll and the dressing room; `/path`
is what changed. The rail's foot chip is split in two to match: the character
plate opens `/you`, the half under it opens `/path`.

**What was built**

- `reference/training/*.json` (nine classes, 644 KB) and
  `reference/journey/{alliance,horde}.json` (34 KB), copied from CPLUS
  unchanged. Training is a per-class dynamic import; the reader fetches one.
- `lib/spell-icons.ts`, whelp plz's own 45 KB stem table, copied unchanged.
- `lib/journey.ts` — the reading. Trainer visits owed, attunement chains with
  progress, class quests sided and levelled, zones about to grey out, the next
  profession threshold. Plus `journeyLetter`, the level's half of §5's letter.
- `app/(app)/path/` — the surface. `lib/path.ts` is untouched and still writes
  the gear half; the page prints the level's sentences first because what you
  are wearing is the older news.

**The rulings this pass made**

- **The ticks are whelp plz's own subjects** — `q:{questId}`, `t:{level}`,
  `p:{skill}:{atSkill}` — on the existing `done` mark kind. When the addon
  starts reporting a spellbook or a quest log, an import lands in the same
  store with no migration.
- **A trainer visit is one tick, not five.** You go once and buy the lot.
- **Nothing ticked ever leaves the page.** A row that vanished when you ticked
  it is a tick you cannot take back. Done visits keep their row and lose their
  list; done errands stay in place, struck through.
- **Only the newest owed visit is spelled out.** Eight expanded visits is the
  price list the old Trainer tab was.
- **Class quests are sided.** The table holds every race's version of the same
  errand and half of them are in cities that would kill this character.
- **Nothing is ranked.** Whelp plz's `lib/plan.ts` scored every move against
  every other one and printed a winner; that is the ranked catalogue §2.1
  refuses, and it is what made the old tab a chore list. Everything comes back
  in the game's own order.
- **One green on the page**, on the newest visit you have not bought — the
  only thing on it that means "something here is for you".

**Still open**

- **The room's half is not built.** The table above puts the trainer's card in
  the city room and an attunement step in the instance room where it is picked
  up. That needs the `room`/`entry` reshape in §The one structural change, and
  `/path` deliberately does not wait for it — every row that names a place is
  already a door into that room.
- **Five pipeline names are not rooms**: three battlegrounds (correct — Tari
  has no room for a queue), "Dire Maul" as the building rather than a wing,
  and "Stormwind City", which is aliased in `lib/journey.ts`.
- ~~The import does not write `done`.~~ **Done, same day.** `lib/import.ts`
  already held `matchImport` and had held it all along; what was missing was
  the catalogue to match against, and its own header said that came from
  `lib/journey.ts`. `importCatalog` + `creditImport` join the two ends and
  `you/new/Creator.tsx` awaits the credit before it navigates. Proved against
  a real level 17 rogue string: eight trainer visits, one class quest and one
  profession milestone credited, and `/path` opens saying "up to date".
  `setMarks` in `lib/marks.ts` is the one-commit write it needed, and it only
  ever adds — the addon reports what a character has, never what it has not,
  so an import can never take a hand-tick back.
- ~~Two fields the addon could send and does not.~~ **Added, same day: TA2.**
  `L:` is the quest log as it stands and `K:` is every talent's rank, one
  digit each. The addon is not on CurseForge yet, so the format was free to
  move; the tail is keyed, so a TA1 string is simply one with two fewer
  fields and still reads. `L:` is the one that changes what `/path` can say —
  a chain whose next step is in your bag now says **In your log** and leads
  the letter, because it is the only thing on the page you could be *doing*
  rather than starting.
  **`KNOWN_VERSIONS` in `lib/import.ts` is the other half of a bump** and it
  was forgotten for ten minutes: the addon emitted TA2 while the site still
  refused anything but TA1, so the reader was told their own addon was from
  the future. The list is newest-first now and the refusal quotes its head,
  so the message cannot drift from the list again — but adding a prefix to
  the addon still means adding it there in the same breath. `K:` is parsed and stored and nothing reads it yet:
  the talent-gated trainer rows it would settle need a talent→row map out of
  CPLUS first, and until that exists `optional` is still the honest answer.
- **The quest log is a photograph, not a record.** It is kept on the
  character and replaced by the next import, never turned into marks — a mark
  is something the reader did and does not take back, and a quest leaves the
  log the moment it is handed in.
- **The rail chip carries no count.** `waiting()` in `lib/journey.ts` returns
  one, but the chip would have to load a 70 KB class file on every page in the
  app to show it.
