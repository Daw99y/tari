# Pins — the atom, built

## A pin no longer needs a spot — 2026-08-30

The atom was **one person, one spot, one sentence.** It is **one person, one
sentence, and a spot when there is a map to put it on.**

Thirty-three rooms have no map plate and never will: every dungeon, every
raid, and the four hubs (`lib/maps.ts` names the forty-six that do). Under a
required `x`/`y` those rooms could not hold a single pin — which put the
product's own atom out of reach of exactly the places a warning is worth the
most. Nobody needs telling that Elwynn Forest is quiet. Somebody does need
telling not to pull the courtyard from the ramp in Shadowfang Keep.

So `pins.x` and `pins.y` are nullable, and there are two doors onto the same
record:

| door | spot | where it shows |
| --- | --- | --- |
| the map's composer (`components/ZoneMap.tsx`, `Say`) | the reader picked one | the mark on the map, **and** the room's card stack |
| the room's card stack (`app/(app)/r/[room]/Left.tsx`) | none | the card stack only |

`onTheMap(pin)` in `lib/pins.ts` is the one test. The map filters on it before
drawing a mark; a spotless pin has nowhere on that picture it belongs. The API
refuses half a spot: send both or send neither.

A reply stands where its pin stands, including nowhere.

### The card stack

The middle of a room with no guide file is a deck, and the cards are what
people left. It is the guide's own deck (`Story.tsx`) with the cards coming
from readers instead of from a file — so a written room and an unwritten one
are the same object, and the second is not a placeholder for the first.

The composer stands **in** the deck rather than beside it: you write in the
shape of the card you are making, and what you wrote is the card on top when
you are done. That is the whole reason it is not a link to somewhere else.

An empty deck says only what the room already knows — that nobody has written
it, the pipeline's level band, and the room it stands inside. It invents
nothing, and a capital's "1–60" is not drawn at all, because a figure that
tells nobody anything is worse than no figure.


docs/TARI.md §2.2 defines it; this doc records the shape it took.

> **A pin. One person, standing in one spot, saying one thing.**

It stays. The next person who reaches that spot around that level sees it.
Everything else in the live layer is a variation on it; this is the one
thing in the product that is new to the world.

## The three rulings (Kacey, 2026-08-26)

1. **Signed-in characters leave pins.** A pin is permanent and carries a
   name, a class colour and the author's level at that moment — the level
   is what makes level-indexing real. Guests read everything. This is the
   one deliberate exception to auth.ts's "signing in grants no feature":
   the feature a stranger loses is *being on the permanent record*, which
   is not a feature a stranger can have.
2. **Replies from day one.** "A human made it, humans reply" is in the
   atom's definition. One level — a reply cannot carry replies. A thread
   is a pin and its answers, never a forum.
3. **All pins render; near-level pins are louder.** Nothing hidden. A pin
   written within five levels of the reader stands at full strength; the
   rest are quieter marks. The record accumulates in plain sight.

## The face — the debuff that does not wear off

The pin's face is the Seduced widget from the landing page (Kacey,
explicitly): the glass chip, the icon, the name, the note, and the bar
that fills once and never drains. On the hero that bar is a joke about
the product; on a pin it is the point made visible — **a pin does not
wear off.** `components/PinChip.tsx` carries it.

**The icon is the game's own treasure map** (`INV_Misc_Map_01`, from the
vanilla icon pack in undiscovered; deployed as `public/pins/map-x.png`) —
X marks the spot — and it goes **everywhere the pin appears**: the map
mark (in the hunt marks' own frame, pink ring when pressed), the chip's
icon slot, the "Leave a pin" chip, the draft ghost. Kacey's ruling,
2026-08-26: *the app should feel like the world, alive — the more of the
game's own familiar objects, the better.* This amends §7.1's "real icons
only for content" for the pin: the marker is a real asset on purpose. The
drawn aggro `!` (`PinGlyph`) stays in PinChip.tsx for the vocabulary.

`--seduce` is spent here, as DESIGN.md always said it could be: the pin
marker and the chip's icon and bar. Nothing else on the map may use it.

## Where a pin lives

**In Neon, forever; on Ably, for the second it lands.** Permanence is a
table (`pins` in db/schema.sql, additive). Ably only fans out the moment:
`POST /api/pins` publishes the new pin on `tari:<room>::pins` so every open
map watches it land. History, scrollback and merge rules do not apply —
the table is the history.

A pin is anchored to **map coordinates** (the same 0–100 space the spots
and the hunt layer use), so it renders through the plate's registration
like everything else. Rooms without a plate have no pin surface yet — the
map is where a spot can be said out loud.

Removal is a tombstone (`removed_at`), in the schema's own tradition: the
author may take back what they said; nobody else may. Rows are never
deleted.

## The surfaces

- **The mark.** The treasure map, X out, in the hunt marks' 26px frame,
  counter-scaled like every mark. Near your level it is full; far from
  it, quiet (0.55) but never hidden.
- **Hover is the chip.** The whole utterance, as a quotation — the same
  grammar as the item plate.
- **Press is the thread.** The map's right rail: the chip, the replies
  under it, and the composer. Your own pin carries one quiet "take back".
- **Leaving one.** A "Leave a pin" chip in the map's layer bar. Pressed,
  the next press on the plate sets the spot; the rail becomes the
  composer. One field, a cap of 240 characters — one thing, said once.
  Signed out, the rail says so and points at the Character tab.

## What it refuses

No routes between pins, no ordering, no ranking, no reward. No pin count
badges on the rail. No editing — take it back and say it again. No
replies to replies. The pin is a noun.

## Wire and files

- `db/schema.sql` — `pins` table, additive, cascades off `users`.
- `lib/pins.ts` — the types, the caps, the channel name, `readPin`.
- `lib/pins-db.ts` — server read: `pinsIn(room)`, threads assembled.
- `app/api/pins/route.ts` — GET (public, stamps `mine`), POST (401 for
  strangers, rate-limited, publishes the landing), DELETE (own, tombstone).
- `components/PinChip.tsx` — the face.
- `components/ZoneMap.tsx` — the layer, the rail states, the composer.
  (Its authored POI layer renamed `poi` in class/type names; "pin" now
  means only the atom.)
- `app/(app)/Live.tsx` — exposes the realtime handle so the map can watch
  pins land on the one socket.
