# Drops — the upgrade surface, in Tari's shape

Written 2026-08-26. `CARRYOVER.md` ruled that whelp plz's Upgrades tab becomes
*"What drops here for you"* and nothing becomes a tab. This file is the rest of
that ruling: what the tab actually held, where each part lands, and the one new
place the room grows to hold it.

Four decisions taken today:

1. The cross-zone answer lives on **`/you`, as the letter** — never as a list.
2. An opened item **takes the middle of the canvas**, the way the map does.
3. **`found` and `wish` come back now**, not later.
4. **Coordinates first**, before any wiring. See "The spot" — the source turned
   out to be pfQuest, not CPLUS, and the work is an afternoon rather than a
   pipeline phase.

## What the tab actually held

Measured against `components/upgrades-tab.tsx` (1,750 lines) and its item panel,
not against memory of it.

| whelp plz | Tari | where |
| --- | --- | --- |
| four lenses + wishlist | **gone.** The rail is Azeroth; a lens across zones is a route (§2.1) | — |
| a stop card per place, with a count | the room itself is the stop. The count is the card's head | room |
| items grouped under the boss that drops them | the same grouping, inside the card | room |
| rarity ring, name in quality colour | shipped | room |
| best source + odds on one line | shipped (`sourceLine`) | room |
| found tick, one click on the picture | **the mark, returning** | room |
| "in your bags" hollow mark, from the import | the same, from `lib/character.ts` | room |
| the route: Zone → Drop → Yours | the stage, and its first node is now a **crop of the real map** | stage |
| drop-% dial, kills-to-expect | the stage | stage |
| worn → this, as one plain line of stat deltas | the stage | stage |
| all sources, +n more | the stage | stage |
| "the next one down your slot" fallback | the stage, but scoped to this room | stage |
| the wishlist as a lens | the star stays; the list of stars does not | mark only |
| dungeons ranked by upgrade count | a hint on the rail row | rail |
| "which of my slots are behind" | **the letter, on `/you`** | path |

The tab's information survives almost whole. What dies is the *shape*: five
lenses over one flat catalogue, which is the shopping list §2.1 refuses.

## The three places

**One — the room's card.** `Drops here`, in the objects column. Exists. It gains
a count line, the boss grouping, the two marks, and rows that are doors.

**Two — the stage.** The middle of the photograph. New, and the rest of this
file is mostly about it.

**Three — the path.** `/you` says what is behind and names the rooms that answer
it. Two sentences, never a table.

## The stage

DESIGN.md says the canvas has four places and *"the middle of the photograph is
empty on purpose."* This does not add a fifth. It says what the middle already
is:

> **The middle is the stage. It is where a thing you opened stands, and only one
> thing stands on it at a time.**

Two subjects today — the map and an item — and they are the same mechanism.
`components/MapDock.tsx` already has all of it: a veil that closes on click, a
panel that holds the subject, Escape, and a remembered preference. The item
reuses it rather than inventing a second. Opening an item folds the map;
opening the map folds the item. The objects column sits behind the veil and
dims; it does not move.

This also settles DESIGN.md's open question **"The map and the objects"**: the
plate takes the middle, the objects fold behind it. Not written into DESIGN.md
until the code does it — that file records what shipped.

### The stage is not the plate

`ItemTooltip` is a quotation and stays one: hover, the game's black, the game's
Arial, the pinned hues, nothing leaving the plate. The stage is Tari's own
register on Tari's own surface — the card (`rgba(6,6,10,.86)`, blur 24, 0.5px
rule), the app's face, the app's ink.

The division is by *register*, not by fact. The plate quotes what the game says
about an item. The stage says what **Tari** knows: where it is, how often, how
many swings, what you are wearing instead, and what to wear until it drops.
An item can be both hovered and opened, and neither is a smaller version of the
other.

Layout, once, on the 5K: the route runs down the left, what it costs sits right
of it, the rest spans under both. `min(100%, 48rem)` overall — narrower than
the map plate, because a route with three nodes in it does not want a wide
frame. Widen toward 56rem when the comparison lands beside the odds.

Four things settled while building it:

- **The map is lent, not lost.** An item opened over an open map borrows the
  stage and gives it back — closing the item returns the map rather than the
  bare room. Only closing the map writes the remembered preference, because
  only closing the map changed it.
- **Nothing on the stage is a score.** A 1.1% drop drawn as an arc is an
  invisible sliver, and drawn as a readable arc it is a lie. The number is the
  number, at display size, with the kills under it in mono. No ring, no bar,
  no dial — which is the loot panel's own rule about stats being entries.
- **No arrow between the nodes.** §13 refuses the arrow, and a route with only
  one possible shape does not need one to be read. A hairline, three dots, and
  the reader's dot is the only filled one.
- **The plate's tap mode leaves the loot row.** A press cannot mean two
  things. Hover is the quotation; press is the stage; on a device with no
  hover the stage is the surface worth having.

### The route's first node

Whelp plz drew a photograph of the zone in the Zone node. Tari has something
better and has had it since the map landed: **a crop of the plate, centred on
the spot the thing actually drops.** Same picture the map dock opens, scaled to
the node, with the spot marked. This is the single most valuable thing on the
stage and the only part of it whelp plz structurally could not have.

## The kit — the revamp of 2026-08-26, second pass

Kacey's second ruling, same day: even upgraded, the corner card was a
placeholder — too small to be the feature. So the card's *contents* moved to
the stage and the corner kept only the announcement.

**The summons** (`Drops.tsx`): not a card — an instrument. The game's own
upgrade arrow, redrawn as our vector (§7.1) in its green — the one colour
every player already reads as "better than what you have". Gold stays the
compass's alone. Hover breathes out a preview
card over its shoulder — the count at display size, slots answered, the
items' faces (each still answering hover with the plate), crossed-off state,
one mono line — and holds while hovered so the faces can be asked about.
The press opens the kit. The breath hides while any subject is on the stage
(`.room:has([data-stage])`). A cleared corner breathes the stamp line.

**The kit** (`Kit.tsx`, the stage's third subject, **wearing the map's exact
frame** — same insets, same fold, origin at its own emblem's corner, so
swapping map↔kit reads as turning a page): the
room's answers laid against the reader's slots, in the sheet's order —
Main Hand, Two-Hand, Held, Back, Legs, Finger… Each row: the slot, what is
worn there now (the weaker of a pair; priced through `/api/items`), and the
offers — icon (hover = plate), name (press = stage), source line, the trade
in deltas, the tick and the star. Slot-first because the reader's question
is "what am I missing"; the map answers "where"; the stage answers "this one
thing". Still bolted to the room: a slot with no answer here is not a row,
so it structurally cannot become the shopping list.

**The dock generalised**: three subjects, one `beneath` ref — an item opened
from the kit returns to the kit, from the map returns the map. One level of
memory, never a stack.

**The map's marks wear the items' faces**: a hunt mark is the best item's
own icon in a small dark frame, a count when more stand there, and the
quest ring at a giver's shoulder. A glance says *what*, hover says
everything, press opens the list. The anonymous ring glyph survives only as
the layer chip's emblem.

**The stage says the source's facts on the node**: level range, boss/rare/
elite, instance, spots recorded — no flip needed for a fact. And every
"also from" line is a door to that source's own face.

## The marks

`lib/sync.ts` already declares `found` and `wish` among the six kinds; `fav` is
the only one wired. Adding these two is a `setMark` call, not a new file, and
the server half has been finished and unused since the split.

- **found** — filled tick. What you did. One click on the picture.
- **wish** — star. What you are hunting. Filters the card, and nothing else:
  there is no page of stars, because a list of stars across zones is the
  shopping list again.
- **owned** — hollow tick, from the import. A read, never a write. Whelp plz's
  rule holds: an import that ticked found marks would be the app deciding that
  having a thing is the same as having gone and got it.

**Found sinks, never hides.** A found row drops to the bottom of its group, so
the top of the card is always what is left. **A cleared room collapses to one
line with the stamp on it.** Both are whelp plz's, both were right.

The card's head gains one line: `6 of 11 crossed off`. It is the only number,
and it can go down as well as up (§13).

## The spot

**The source turned out to be pfQuest, not CPLUS.** `scripts/map-pins.py`
already downloads and parses `units.lua`, which carries every unit's position in
1.12 map percent — the same coordinate space the plates are registered against.
Its own header says why coordinates never come from ClassicDB: those are world
coordinates, and converting them means trusting map bounds this pipeline avoids.
That argument applies unchanged to mangos's `creature` table, so the CPLUS
spawn-coords phase is not the way in.

Built 2026-08-26 against `units_coords()` (10,385 units) and all 46 plated
rooms: **221 of 221 drop sources placed. 100%.** Not one is off the plate.

| room | drop sources | placed |
| --- | --- | --- |
| Redridge Mountains | 31 | 31 |
| Westfall | 30 | 30 |
| Duskwood | 27 | 27 |
| Stranglethorn Vale | 25 | 25 |
| Loch Modan | 17 | 17 |
| Wetlands | 16 | 16 |
| …40 more | | |
| **total** | **221** | **221** |

**The two layers agree.** Six Duskwood creatures are both a curated rare pin
and a drop source, and their coordinates match to the decimal in both files —
including the two with several spawns, where the pins' rule (first recorded)
and the spots' rule (busiest camp) had to arrive at the same place
independently. A creature does not stand somewhere different depending on
which layer drew it.

**Where the layer is thin, it is the pipeline and not the plate.** Felwood and
Feralas emit zero drop sources because every item in them is a quest reward;
Tanaris has one, Winterspring three. That is CPLUS's `PHASE-SPAWNLESS-1`
showing through — 615 creature templates have loot and no spawn row, 213 of
the 272 items they cost the emission are level-50 gear. The spots layer is at
100% of what exists; making it *deeper* past level 50 is that phase's job, not
this one's. EPL is the same story in its purest form: 25 items, all quest
rewards, pointing at giver pins the curated layer already carries.

### A second file family, not a bigger pin file

`lib/maps/<room>.json` is the curated layer: quest givers, turn-ins, six rares,
the objective clouds. Hand-tuned, capped, read by the open map.

`lib/spots/<room>.json` is the dense layer: `creatureId → [x, y]` for every unit
the room's items name as a source. Different lifetime, different size, different
reader — the room loads only the spots for the eight rows it drew.

**Amended 2026-08-26: the open map reads the drawn rows' spots after all — as
the hunt layer.** The original rule was about size (never ship a room's whole
dense file to the browser), and that half holds: `lib/spots.ts` filters to the
eight rows' sources on the server and hands the map the same `HuntSpot[]` the
stage's crop reads. What fell was the idea that the full map stays purely
curated. The map is the room's largest framed object and the spots are 100%
placed; leaving upgrades off it made the corner card carry a feature the plate
could carry better. Marks are the app's dark against the curated paper, so
whose layer drew a thing stays legible, and the chip is `Drops for you`.

Written by a **new** `scripts/map-spots.py`. It imports `units_coords` and
`zones.py` from the existing script and regenerates nothing that already exists.

## `/you` — the letter and the slots

Two things, and neither is a list.

**The letter's line.** In the register of §5 — *"Three of your slots are older
than your level. Two of them fill in Stranglethorn."* It names places. It does
not order them, rank them, or say what to do first.

**The sheet's slots.** `app/(app)/you/Sheet.tsx` already draws the 19 slots in
the game's order. A slot the level says is behind wears a quiet mark — the
register of the hollow tick, not a badge and not a number. Pressing it names the
rooms that hold answers, and those names are links into rooms.

That is the whole cross-zone surface. It is a doorway back into places, which is
the only form §2.1 allows.

## Navigation — nothing new

No rail entry, no tab, no `/upgrades`. The rail is Azeroth and `/you` is its
counterweight; a third top-level entry is the tab returning under another name.
The item index already exists and is promised in §11.3: **⌘K reaching any room,
item or person.** An item found there opens the room it drops in, with the stage
already up.

## Build order

Each step is usable before the next one exists.

1. ~~**The spots.**~~ **Done 2026-08-26.** `scripts/map-spots.py` →
   `lib/spots/*.json`, 46 files, 200 KB, 221/221 placed. Data only; no app
   file touched. Re-run after any `rooms-from-zones.py` run.
2. ~~**The stage.**~~ **Done 2026-08-26.** `components/Dock.tsx` +
   `dock.module.css` (was `MapDock`, moved to `_to_delete/`), plus
   `components/ItemStage.tsx` + `item-stage.module.css`. `Room.tsx` wraps its
   four places in the dock; loot rows are `Door`s. The map's half of the CSS
   is unchanged to the pixel. tsc clean, rendered and checked at
   `/r/duskwood?class=rogue&at=24`.
3. ~~**The stage's contents, the rest.**~~ **Done 2026-08-26 (comparison).**
   `lib/worn.ts` + `/api/items` (reference/items.json, vendored from CPLUS's
   ITEMDICT — 10,532 items in the plate's fields, read from disk, never
   bundled). The stage reads the character's gear on this machine, prices the
   worn piece on the server, and says it in one line: worn name → deltas.
   Two of a slot compare against the weaker. No gear in the slot is its own
   sentence. *The in-room fallback ("next one down your slot") still waits.*
4. ~~**The marks.**~~ **Done 2026-08-26.** `app/(app)/r/[room]/Drops.tsx`
   (client): the picture is the found tick and still the plate's hover; the
   star hunts; found sinks and quietens; the head counts `n of m crossed
   off`; a cleared card collapses to the stamp line. Rows gather under their
   best source — the boss grouping — and the group head names it once, so
   the row keeps only the odds.
5. ~~**The crop.**~~ **Done 2026-08-26.** `components/Crop.tsx`: the plate at
   zoom×, centred by the sheet's own transform, spawns as quiet dots, the
   spot filled. In the route's first node; pressed, it lends the real map
   centred there (`Dock.openMapAt` → `ZoneMap.focus`, one breathing ring,
   preference untouched). Also 2026-08-26, past the plan: **the hunt layer**
   (ZoneMap `mark`/`camp`/`Quarry`, hover is the plate, press is the stage)
   and **the source face** (`ItemStage`'s second face: a creature at its
   camps or a quest and its giver, and what it holds for you here — every
   source a door, nothing a dead grey line).
6. **The path.** `/you`'s letter line and the sheet's slot marks.
7. **DESIGN.md.** Record the stage as settled, and close the "map and objects"
   open question.

## What this refuses

- No lens rail. No four windows onto one catalogue.
- No ranked list across rooms, on any surface, under any name.
- No wishlist page. The star marks; it does not gather.
- No instance leaderboard. The rail carries a hint, not a ranking.
- No badge that only goes up (§13). The one number is `n of m`, and it moves
  both ways.
- No arrow between a room and the room that holds the next item.
