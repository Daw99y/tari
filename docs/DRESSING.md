# The dressing room — hand-equipping on the sheet

Built 2026-08-26. `docs/STATUS.md` §0 has the state; this is the argument and
the shape. Five rulings from Kacey opened it and they are written here first,
because everything below is a consequence of one of them.

## The rulings

| | |
| --- | --- |
| **What it is for** | Both — trying on a look *and* planning — **planning first**. The drawer is ordered so the top row is the best thing this character could be wearing here, and you may still put a robe on for the look of it. |
| **The import** | An **overlay that never overwrites**. `Character.gear` stays exactly what `/tari` handed over; a hand-equipped slot is a mark laid over it, and taking the slot back gives the imported item straight up again. A re-import cannot lose a choice, because the two halves never touch. |
| **The path** | **It reads what is shown.** Put a level 29 chest on a level 24 and that slot stops being behind; the letter recounts and the arrow goes. |
| **The drawer** | **What your class and level can wear.** A rogue never scrolls past nine hundred plate chests. |
| **The reach** | **Everywhere. The plan is the truth** — the doll, the sheet, the letter, the arrows, the room's kit rows and the stage's worn line all read it. *"Make it clear users know though."* |

That last clause is the whole design problem. If the plan is the truth
everywhere, then every number the app states about a character is a number
about a character who may not exist. So:

> **The plan is read everywhere and admitted everywhere it is read.**

Three places, one sentence each and nothing more:

- **The letter** gains a third line — *"Two slots are yours, not the game's."*
  The first two lines do not change their register. They are true about the
  figure on the screen either way, and a conditional grammar threaded through
  both of them to carry one fact would be the app apologising rather than
  stating.
- **Each planned slot** wears a ring on its icon. Not the accent —
  `DESIGN.md` spends the pink twice a screen and nineteen slots is not twice —
  ink at `.55`, the hollow tick's register.
- **The stage's worn line** says *"Against what you plan to wear"* when the
  row it is pricing against is one the reader chose. It is decided by the row
  actually used, not by whether either of a pair happens to be planned: two of
  a slot compare against the weaker one, and that is the one the sentence is
  about.

## The shape

```
press a slot ──▶ Drawer.tsx  ──▶ /api/wardrobe?at&cls&level&q  ──▶ ids
                     │                    │
                     │                    └─ reference/items.json (server)
                     │                       + lib/proficiency.ts
                     ▼
              catalogue.json (already in the browser: icon, name, quality,
                     │         the look the doll needs)
                     ▼
              planSlot() ──▶ equip mark ──▶ lib/plan.ts overlay
                                                 │
        ┌────────────────────────────────────────┼──────────────┬────────────┐
        ▼                    ▼                   ▼              ▼            ▼
   the doll          the sheet's slots      lib/path.ts     room Kit    ItemStage
```

### `lib/proficiency.ts` — the game facts

Who wears what and who swings what, in 1.12, written by hand. The client
states proficiency through trained spells, which is a fact about one character
rather than about a class, and the export does not carry it. `lib/character.ts`
holds `TRADES` by the same argument.

Two levels are in the table and no others: **plate at 40** (warrior, paladin),
**mail at 40** (hunter, shaman). Plus **dual wield** — warrior 20, rogue 10,
hunter 20, and nobody else in 1.12, which is the one rule `gearIndices` cannot
express on its own: it sends every one-hander to both hands, which is right for
a rogue and wrong for a paladin. A shield and a tome are not weapons and are
not covered by it.

Permissive where the dictionary is quiet: a row with no subclass is a ring, a
cloak, a tabard or a holiday mask, and nobody is barred from those.

### `app/api/wardrobe/route.ts` — the drawer's door

`reference/items.json` is the only thing that knows an item's required level
and subclass, it is 1.8 MB, and it is already loaded and held by `/api/items`.
This is the second door onto it. Answers with ids; the drawer draws from the
catalogue the page already has, so an id the catalogue has never heard of is
one the doll could not draw anyway and is dropped rather than listed and then
failed. Cached a day.

**The one piece of arithmetic in it.** 1,870 of the dictionary's 10,532 rows
carry no required level at all and 856 of those are level-40-and-up gear — a
hole in the dump, not a fact about the game, and a hole that put Naxxramas at
the top of a level 24's drawer on the first run. Where both numbers are present
the difference is 5 on 6,332 rows of 8,662, so a row with no required level is
read at its item level minus five. With that in, a level 24 rogue's chest
drawer tops out at item level 29 and a level 40 warrior's at 45, which is what
"the best thing you could be wearing" means.

### `lib/plan.ts` — the overlay

The `equip` mark was declared in `lib/sync.ts` long before there was anything
to write it: the odd one of the six, a slot→item map rather than a set, which
is why it has a `val`. Subject is the gear index, `val` is the item id,
un-equipping is the same tombstone every other mark uses. Local first, synced
per character, no server change and no migration.

`planKey` is load-bearing and does not look it. `useMarks` hands back a new
store object on **every** commit anywhere in the app — a starred room, a found
item, a sync that pulled nothing. A plan memo keyed on that store returns a new
Map every time, which returns a new gear array, which re-runs the sheet's
dressing effect, which tears down and rebuilds every mesh and texture on the
figure. Keyed on the plan's own signature instead, the figure is rebuilt when
the gear changes and at no other moment. The same trick is in `Kit.tsx` and
`ItemStage.tsx`, where it was an `/api/items` refetch per star.

## The second pass — Kacey, same night

Four things, after clicking it through.

### The summons came off the card

The arrow used to open a list of **zone names**, which told a reader where to
go without telling them what for. It opens **the gear** now — the actual items
those rooms are holding, grouped under the room that has each, with the room's
name still the door §2.1 allows. `lib/path.ts`'s `BehindSlot` grew `answers`
for it: the same `panelRows` pass that was already collecting room ids now
keeps the rows themselves, so the panel cannot disagree with the count above
it.

And it became a button. It stands **outside the card**, in the gutter toward
the doll, as a green pill with the number of upgrades on it — the game's kind
of button, a lit face and a dark rim. The argument: a mark inside the card
could afford to be quiet because it only meant *look here*; a control that
opens a room's gear is a control, and one that says nothing about how much is
behind it makes the reader press it to find out. The panel now opens past it
(`calc(100% + 3.1rem)`) rather than over it, and the weapons row's gap widened
to 3.4rem so the main hand's summons stands between the two cards instead of
on top of the off hand's.

### Every row grew two marks, a door and a plate

`app/(app)/you/Row.tsx` — one row, used by both panels, because they are two
questions about the same object. Four targets, one meaning each: the picture,
the name (a door to the item's card in the room that holds it, inert when
nothing in the window drops it), the **wish star** — the same one the room's
kit writes, lifted into `components/WishStar.tsx` so there is one star — and
the **slot's own silhouette**, which puts it on.

And the plate. Hovering the picture or the name asks for the game's own
tooltip, the way it does everywhere else in the app: a reader choosing between
two cloaks is choosing on numbers. `lib/plate-item.ts` joins the dictionary
row to the shape `ItemTooltip` reads; the plate is asked for **`quiet`**, a new
flag that drops Tari's half. The sheet holds the dictionary and not the world,
and a plate answering "Source unrecorded" over every cloak in the game would
be stating the sheet's ignorance as a fact about the item. The row's door is
what answers that question.

`/api/wardrobe` returns the dictionary rows beside the ids — it has them open
already, and a second request per drawer would be two round trips for one
press. `/api/items`' cap went 24 → 100 for the summons panel, which asks about
a room's worth rather than a paperdoll's.

### Nothing moves any more

The letter grows a line when something is planned and loses one when a plan
closes a slot, and a header that changes height re-centres both gear columns
under it. So the letter is **always drawn and always tall enough for its
longest self** — three lines and their two gaps, reserved. The sheet must not
move because the reader put a hat on.

### Two traps, both worth remembering

**A `max-age` on a route you are still writing is a bug you cannot see.**
Cloaks and necks kept offering item level 60 to a level 24 long after the
required-level arithmetic was fixed, while chests behaved — because the chest
URL had first been asked for after the fix and the cloak URL before it, and
the browser was holding the old answer for the day the header told it to. The
route now says 60 seconds, and the drawer asks with `cache: "no-cache"`, which
is the posture `loadCatalogue` already takes and for the same reason.

**A grid column sized `auto` is sized to max-content.** The rows are flex
containers inside a grid list; with the column left to size itself, a long
item name pushed the star and the slot glyph past the panel's edge instead of
ellipsising, and they were simply not there. `grid-template-columns:
minmax(0, 1fr)` on both lists is the whole fix. The row was in the DOM the
entire time, which is why it took reading the box geometry to find.

## The third pass — the square, and the slot that was missing

### The summons is a square now

It was a pill and it breathed with the number in it: 1 was narrow, 17 was
wide, and a column of them read as a bar chart of something nobody had
measured. A key is a key whatever is written on it, so it is a fixed 2.15rem
square on every slot, arrow over count, and the digits change inside it.

It also lost its moulding. The first cut had a hard second-tone base under it
and a dark line across its bottom edge — the arcade-key treatment — and at a
slot's size that read as two stacked objects rather than one. One face, one
gentle gradient, one soft shadow. Plush, not embossed.

### The third slot is back, and the figure still has two hands

`SHEET_BOTTOM` was `[16, 17]` and the ranged socket was left out because a
bow, a gun, a wand and an off-hand weapon all hang off a hand, and a figure
wearing all three has three weapons and two hands to hold them in. Kacey,
2026-08-26: draw it anyway — a hunter's bow is the slot that matters most to
them and it was the one the paperdoll refused to show — and do not put it on
the doll.

So `SHEET_SLOTS` is what the sheet draws and **`WORN_SLOTS` is what the figure
wears**, and they differ by exactly that one id. The slot names itself by class
(`thirdSlot` — a paladin, a shaman and a druid carry a **Relic**, everyone else
a **Ranged**), it takes a drawer and a summons like any other, and `lib/path.ts`
reads it now: bows, guns, thrown and relics are all in the pipeline's own slot
vocabulary, so the arrows and the letter count it without any new plumbing.

A level 24 druid's relic drawer says *"Nothing in the game fits this slot for
you yet."* That is correct and worth knowing: the earliest idol in 1.12 is
Idol of Ferocity at 52, and the same is true of every libram and totem.

### A row is named from whichever half has it

Which surfaced the moment the relic slot existed: the wardrobe catalogue has
**no art at all** for idols, librams and totems, because the client never draws
them on a character — so the drawer, which built its rows from the catalogue,
said "nothing here the wardrobe can draw yet" and offered a reader nothing.

`lib/plate-item.ts` gained `RowItem` and two builders. The catalogue knows what
a thing *looks like* and is the reason the doll can wear it; the dictionary
knows what it *is*. A row is named from whichever half has it, and only the
catalogue half is `drawable`. The slot card takes the same fallback, so a
planned relic reads as itself rather than as `#22395`.

### And the drawer draws sixty

Two hundred rows each carrying two `ItemHover`s is four hundred components
with their own refs, effects and portal bookkeeping, laid out synchronously the
moment a slot is pressed — the page locked up for tens of seconds the first
time the tooltips met a full chest drawer. Sixty are drawn; the rest are
counted in the note and reachable by name. `app/lab/doll`'s picker capped
itself for the same reason and said so.

## What the sheet gave up

**The card's press now opens the drawer, and the arrow got a target of its
own.** Before this the whole card was the arrow's press and the mark could
afford not to be one (`DROPS.md` step 6 says so explicitly). It cannot now: a
slot on a paperdoll means *change this*, and that is the press a reader will
reach for. So the arrow is a 1.6rem square over the glyph, the two presses say
what they open, and `.arrowPress[aria-expanded]` carries the grow that
`.press[aria-expanded]` used to.

**A two-hander is in both hands.** The game greys the off hand under one and
`lib/path.ts` already refused to accuse it; before the dressing room an import
could not produce the pair and now a reader can. So the sheet does not hang
anything off the second hand under a two-hander, the card dims, and the
drawer for it says *"Both hands are on Ashkandi."* and offers nothing.

## Open

- **The two-hander is decided twice.** `lib/path.ts` reads it off the item
  dictionary (`s === "Two-Hand"`); the sheet reads it off the catalogue
  (`inventoryType === TWO_HANDED`). Same fact, two sources, loaded on different
  schedules — between catalogue-ready and dictionary-ready the sheet greys the
  off hand while the path is still calling it behind. Harmless for a frame,
  wrong in principle.
- **An item the room offers may be one you cannot wear yet.** The summons
  panel mirrors what the room shows, and the room shows things by the level of
  the *source* — a neck out of Hillsbrad at 23 that asks for level 40. That is
  settled behaviour for a room (DROPS.md step 6) and it is why the drawer's own
  rl filter and this panel's contents can disagree. The plate says the required
  level in red; nothing else does.
- **Narrow.** The drawer opens sideways into the doll's column and the
  `@container stage (max-width: 64rem)` block does not reposition it — the
  same placeholder the rooms panel already sits in. `DESIGN.md` "Narrow".
- **Nothing prices the plan.** The stage compares one item against what you
  wear; nothing yet compares the *plan as a whole* against the import, and
  nothing asks whether a planned item is gettable. Both are arguable and
  neither was ruled on.
- **A created body has no class restriction to apply** — it does, actually;
  the creator always states one. But a body whose class the dictionary cannot
  match falls through `canEquip`'s null guard and is offered everything.
