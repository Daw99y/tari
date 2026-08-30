# Design — what has survived so far

Started 2026-08-25; v2 the same day, after the room. `TARI.md` §11.4 says this
file records only what the landing page set and the room kept. Every section
is marked **settled** or **open**. Settled means the code already does it and
nothing is allowed to drift from it. Open means the landing page's answer is
the default until a surface gives a reason to change it.

Add to this file when a second surface needs a thing. Not before.

## The register — settled, rewritten 2026-08-30

**Warm dark, round type, chunky shapes, and the product shown as working
objects.** The landing page settled this; the app follows it. What came
before — the light museum with a bar in it, paper below the hero, everything
framed and quiet — is retired. Kacey called the serif pass an e-book reader
and they were right: a companion for a twenty-year-old game is not a journal.

Three things lie on a warm dark table:

| what | ground |
| --- | --- |
| the table | `--well` `#0b0a12` |
| a panel on it — the rail, the people column, a card | `--panel` `#16131f` |
| a photograph, cropped against its own black | `--ground` `#06060a` |

The gap between them is the divider. There is no hairline separating a column
from its neighbour on either surface, and putting one back is a regression.

**Full-bleed exactly once is retired too.** It held while the app was one
photograph wedged between two flat gutters. The landing draws the same
product as a print — rounded, ringed, weight underneath — and the app draws
it that way now. The room is still the only thing making noise. It is held
rather than jammed.

Every section is one picture of the product and a headline, never a paragraph
about it. If a section needs body copy to make sense, the picture is wrong.
The product in a picture is real: a live `.m2`, a real `ItemTooltip`, the
client's own icons off the CDN. Never a screenshot of itself.

## Colour — settled, rewritten 2026-08-30

Nothing is light. The paper tokens are gone; delete any you find.

| token | value | where |
| --- | --- | --- |
| `--ground` | `#06060a` | what a photograph is cropped against: the room, the hero |
| `--well` | `#0b0a12` | the table everything else stands on |
| `--panel` | `#16131f` | a panel on the table: the rail, the people column |
| `--panel-deep` | `#0a0912` | a well inside a panel |
| `--ink` | `#f2f0ea` | text |
| `--mute` | `rgba(242,240,234,.62)` | secondary text |
| `--rule` | `rgba(242,240,234,.22)` | a hairline on a card |
| `--hair` | `rgba(242,240,234,.09)` | a hairline inside a panel |
| `--accent` | `#b6ff2e` | see below |
| `--accent-ink` | `#0d1403` | text on the accent |
| `--blurple` | `#5865f2` | Discord's, and not ours to restyle |

All of them live in `globals.css`, because both surfaces speak them.

Dark ink on the art never passes; the room is ink-on-dark permanently
(`CONTRAST.md`).

### The accent

`--accent` is the acid green the client throws for a poison proc. Kacey chose
it on 2026-08-30, and it replaced two colours at once.

It replaced the Seduction pink, which had to hold up over ninety full-bleed
room photographs and did not. It also swallowed `#4ade5b`, the green the app
already wore on the room's upgrade arrow, the rail's arrows and the sheet's
summons key — because a loot table saying "this one is better than yours" and
a stranger leaving a pin are the same promise, and two greens for one meaning
is a colour nobody can read.

**One green, one meaning: something here is for you.**

Allowed: the pin marker and a pressed map spot, the upgrade arrow and its
tally, the summons key, the compass, focus rings inside the room. Forbidden:
a plain button, a link, a heading, the room you are already standing in,
anything that appears on every screen. Two places on a screen is the ceiling.

Three greens are **not** the accent and must never be swapped to it:

- `#1eff00` — Uncommon on the item plate. The game's, quoted exactly.
- `#4ade5b` — Uncommon in the app's own panels. The same word, lightened for
  a dark ground. Never leaves an item name.
- the Seduced debuff's `#ff4f8b`. A spell's own school colour, not ours.

Early access wears `--blurple`. It is a status and Discord is the door to it;
it is not something anybody left for you.

## Type — settled, rewritten 2026-08-30

Four faces, and each one has a job. `app/layout.tsx` loads the first two for
the whole product; `globals.css` names all four.

| token | face | job |
| --- | --- | --- |
| `--round` | Baloo 2 | **names things.** A room, a character, an item, an encounter's subject, a headline. |
| `--sans` | Nunito | **says sentences.** Guide lines, empty states, chat, copy, a control's label. |
| `--app-sans` | system stack | **is read.** Rail rows, slot grids, presence names, numbers, anything dense. |
| `--mono` | `ui-monospace` | **is a read-out.** Eyebrows, meta, levels, counts, bands. |

`--app-display` is the system Display cut and survives for one thing: a figure
set large. A number is not a name, and Baloo's round numerals wobble in a
column.

The system stack is not a fallback and is not on its way out. Baloo at
`0.8rem` in a seventy-five-row rail is soup, and the reader's own OS has
already tuned its interface face for that size on their own screen.

| role | face | size | weight | tracking |
| --- | --- | --- | --- | --- |
| h1 (landing hero) | round | `clamp(3rem, 7.5vw, 6.6rem)` | 800 | −0.02em |
| h2 (landing) | round | `clamp(2.2rem, 4.6vw, 4rem)` | 800 | −0.015em |
| room name | round | `clamp(1.7rem, 4.1vw, 3.5rem)` | 700 | −0.02em |
| character name | round | `clamp(2.1rem, 4.1vw, 3.5rem)` | 700 | −0.02em |
| a name in a card | round | 1.2rem | 700 | −0.01em |
| a room in the rail | round | 0.84rem | 600 | 0 |
| lede / body | sans | `clamp(1rem, 1.25vw, 1.15rem)` | 500–600 | 0 |
| a row, a name in a list | app-sans | 0.8rem | 500 | −0.005em |
| base | | 17px landing, 16px shell | | |

Baloo carries its own width. The tracking that suited a system Display cut
at −0.04em closes it up; nothing in the round face goes tighter than −0.02em.

Mono stays 0.55–0.66rem, uppercase, tracked 0.14–0.2em, muted. It is never a
heading and never body.

Arial appears in exactly one place, the item plate, and that is a quotation
of the game rather than a fifth choice. See "The plate".

Headlines are `text-wrap: balance`, body is `text-wrap: pretty`. Antialiased,
`optimizeLegibility`. Hairlines are 0.5px; on the 5K they are real hairlines
and that is the point.

## Space and shape — settled, rewritten 2026-08-30

| token | value | what takes it |
| --- | --- | --- |
| `--r-lg` | 24px (28px on the landing) | a frame around a picture of the product: the rail, the people column, the stage, ⌘K |
| `--r-md` | 14px (18px on the landing) | a card inside one |
| `--r-sm` | 9px | a row, a slot, a well |
| `--r-pill` | 999px | a button, a chip |

The shell is a 0.6rem gap and 0.6rem of padding. That gap is the only
divider between its three panels.

Landing section padding `clamp(5rem, 12vh, 9rem)` vertical, `clamp(1.25rem,
4vw, 3rem)` horizontal. Row gap inside a section `clamp(2.25rem, 5vh,
3.5rem)`. Copy column 44rem, body column 32rem, both centred. Frames
`min(100%, 72rem)`.

Sections do not alternate any more. There is one ground and the tone colour
is what changes.

## Surfaces — settled

The frame: radius `--r-lg`, a 1px ring at 7–12% and one soft shadow
(`0 30px 70px -30px` at 85%). The room takes `--ground` because a photograph
is cropped against black; the rail and the people column take `--panel`,
because a list of places you can go is an object and not a hole in the
screen.

The card, on the art: `rgba(6,6,10,.86)`, blur 24px, 0.5px `--rule`, radius
12px, `--mute` raised to `.74` inside. `.86` is measured, not chosen
(`CONTRAST.md`). Do not lower it. **The room proved there is one card.** The
past layer, the loot panel and the pin text are the same element with
different rows in it; a new panel does not get a new surface.

The chip: same ground, blur 12px, radius 999px. For single words on the
art — pins, cursors, names, and the guide's subjects. The current chip is
turned over: ink ground, dark text. A chip that is a link and not a state
has a dashed hairline.

The scrim: four gradients — bottom 26%, left 46%, a radial weight at the
edges, and the landing hero's top band (35% to 0 at 18%). Bare ink lives
only inside it. Do not make it heavier for a bright room; recrop the room.

Bare ink (`CONTRAST.md` surface A) is used exactly once in the app: the
guide's placard, in the left band. Nothing else on the art goes without a
card or a chip.

Room art everywhere: `saturate(.9) contrast(1.05) brightness(.95)`. One
grade, never per-room.

## The plate — settled

The item tooltip (`components/ItemTooltip.tsx`, ported from whelp plz).
The one surface in the app that is a **quotation rather than a
description**: a player who has hovered ten thousand items expects the
game's own plate beside the cursor, and a quotation is either exact or
wrong. So it does not take the card's surface and it is not a fourth
ground — it is the game's, held apart:

- Black fill `#05060b`, the game's blue-gray edge `#2a3047`, 6px corners,
  one shadow. No blur — the game's plate is opaque.
- The game's palette, pinned: gold item level, green effects, red for an
  unmet requirement, quality hues at the game's own values on the name
  (`#1eff00`, `#0070dd`, `#a335ee`, `#ff8000`) — not the panel's lightened
  set, because there is no white here. Same licence as the quality
  colours: the game's language, never leaving the plate.
- Arial, 13px. The one place a second face appears, and it is the
  quotation's face — ships with every OS, no font is loaded.
- The icon hangs outside the plate's edge, the way the game hangs it. No
  quality ring; the name beside it wears the colour.
- No fact carried by colour alone: the quality is also a word, right-set
  on the item level line; red requirements still say the level in words.
- Below the rule the register flips to Tari's own: sources, odds, the
  kills math, the faction lock — what the game's tooltip never had.
- One plate at a time; nothing inside it is clickable; hover on 64rem+
  with a real pointer, tap elsewhere; Escape and anywhere-else close it.
  Appears placed, instantly — no fade, nothing slides.

Nothing from this plate — the black, the Arial, the pinned hues — may be
used by any other surface. That is the whole deal.

## The unwritten room — settled 2026-08-30

Two rooms out of seventy-nine have a guide file. The rest drew a photograph, a
name at the top and nothing across the middle, which reads as a loading screen
rather than a decision — and was the single biggest reason the app felt
unfinished.

The middle of a room with no guide is **a deck of what people left there**
(`app/(app)/r/[room]/Left.tsx`, docs/PINS.md). It is the guide's own deck with
the cards coming from readers instead of from a file, so a written room and an
unwritten one are the same object rather than a thing and a placeholder for
it. It carries `data-story`, so it steps aside for the stage with the rule the
telling already had.

The composer stands **in** the deck. You write in the shape of the card you
are making, and what you wrote is the card on top when you are done. A link to
a composer somewhere else is not this.

An empty deck says only what the room knows: that nobody has written it, the
pipeline's level band, and the room it stands inside. A capital's "1–60" is
not drawn, because a figure that tells nobody anything is worse than no
figure. No lore, ever — lore arrives as objects in the telling.

## The canvas — settled

The room is a canvas, not a scroll, and it has four places. **Top, centred:
the name** — eyebrow and title, the way a gallery wall names a room.
**Bottom-left: reading** — the guide's placard and its chips, bare ink.
**Bottom-right: objects** — the cards, stacked, `min(21rem, 34%)` wide.
**The middle** is where the telling stands, and where an unwritten room's deck
stands instead. **Top-right: the compass**, which unfolds the map. It wore gold until
2026-08-30, on the argument that a map is not something anybody left for you.
Every mark on it was, so it wears the accent now. The middle of the
photograph is empty on purpose. Anything new has to take one of the four
places or make the case for a fifth.

Small under large: a placard's eyebrow (mono, tracked) sits over its subject
(display, up to 4.75rem), then a one-line title, then two sentences. The
things that choose it (the chips) sit under it, never beside it.

## Controls — settled, rewritten 2026-08-30

**One button, and it is a pill.** `--r-pill`, 700 weight, `--sans`, no
border. On the art it is glass: 30% ground, 12px blur, ink text. Hover lifts
it 2px on `--pop` and deepens the shadow. Active scales to 0.97. Focus is a
2px outline offset 3px.

A disabled or not-yet button reads as quiet text at 70%, never greyed chrome.

**The door is Discord's.** It wears `--blurple`, Discord's mark and a blurple
glow, drawn the same on the landing and at the foot of the rail — so arriving
in the app is arriving somewhere the door looks the same. It was a grey mono
line in the rail until 2026-08-30 and it was losing a contrast fight with the
word "Favourites". Once the reader is through, it gives the pill back and
becomes a mono statement with a lit mark.

**Rail rows are the landing's card, laid on its side.** `2.75rem` tall,
radius `--r-sm`, the room's photograph at 46% behind the name, a
left-to-right dark gradient so the name sits in the dark end. The name is
`--round` at 0.84rem, because a room has a name. Hover and the current room
take 78%; the current room also takes a 1px ring and a shadow under it. No
accent — where you already are is not news.

**Two exceptions carry the accent as a lit face.** The sheet's summons key
and the room's compass are drawn the way the client draws a control: a lit
face, a dark rim, a shadow under it. The rim is in the geometry on
`UpArrow.tsx` and in four zero-blur drop-shadows on the compass, which is
built from strokes. Nothing else on any surface takes this treatment.

**One distance from the frame.** `--corner` (`room.module.css`, on `.room`)
is the inset every instrument in a room's corners is measured to — the
compass, the summons, the objects column, the chat, the moments rail. Measured
to the glyph, not to the button: a control adds its own tap padding back on
top and takes the same amount off its offset, so padding stays a target and
stops being a margin.

**Motion.** `--pop` overshoots and belongs to what the reader presses. `--ease`
does not, and belongs to what the reader reads. Seventy-five rail rows on a
spring is noise, not personality. Both flatten to `linear` under
`prefers-reduced-motion`.

**One scrollbar**, defined once in `globals.css`: a 10px gutter, a thumb at
14% inset by a transparent border. Every surface is rounded now, and a native
light track drew a hard straight edge down the inside of a soft one.

## Motion — settled

Transform and opacity only. Fades are 1200ms with a 300ms delay so nothing
pops in before its first frame exists. The hero drifts 10% over 60s and
never comes back. The title rises 14px over 1100ms on
`cubic-bezier(.2,.7,.2,1)`. The pin pulses at 2.6s.

Everything above is off under `prefers-reduced-motion`.

Nothing ever spins. Loading is the architecture's problem, not the UI's.

## The stage — settled

The middle of the photograph is where a thing you opened stands, and only
one thing stands on it at a time (docs/DROPS.md). Two subjects — the map and
an item — one mechanism (`components/Dock.tsx`): a veil that dims the room,
Escape, anywhere-out. The objects column sits behind the veil and dims; it
does not move. That closes the old "map and the objects" question: the plate
takes the middle, decided on the 5K, shipped 2026-08-26.

The map is *lent*, not lost — an item over an open map gives it back when it
closes, and only closing a map the reader opened writes the remembered
preference. Lending runs both ways: the stage's crop opens the real map
centred on the spot (a breathing ring, nothing written), and the map's hunt
marks open the stage. The crop (`components/Crop.tsx`) is a photograph of a
place on the map, never a second map: no pan, no zoom, no layers.

On the stage nothing is a score — the odds are type at display size, kills
under them in mono, no ring, no bar, no dial. The plate stays a quotation
(hover); the stage is Tari's register (press); a press means one thing.
Every source is a door: the card turns over to the creature at its camps or
the quest and its giver, and back.

## The live layer — settled

Built 2026-08-26 on Ably (docs/TARI.md §8). Three surfaces, and none of
them is a panel: the room is a photograph before it is an app, and every
one of these had to earn its place on the art rather than beside it.

**Chat is bottom-left, bare on the art.** docs/CONTRAST.md measured that
corner as surface A — the scrim already holds ≥10:1 there on all 77 rooms —
so the lines need no card, no bubble, no border and get none. The column
ends in a mask that fades it into the photograph instead of against an
edge. The name wears the game's class colour, the sentence wears ink. The
one carded thing down here is the input, because a field a reader is aiming
at has to read as an object.

**Enter opens it, Enter sends it, Escape drops it.** The game's own
contract. There is no permanent text box, because a reader looking at
Duskwood should be looking at Duskwood; a mono `↵ to talk` sits where the
line will appear, quiet enough to ignore and learned once. Losing focus
closes an empty line and keeps a written one.

**Cursors are surface C.** The arrow is a vector with its own dark outline
and needs no chip; the name beside it is a chip and gets one. Both carry
the class colour, so a person reads as the same person in the cursor, the
chat line and the people column. Positions are normalised 0–1 against the
room, so everyone points at the same part of the same photograph whatever
their window is.

**The moments rail is bottom-centre**, because it is the one thing down
here addressed to the whole room rather than to one reader — chat holds the
left, the objects hold the right, and the middle is what everyone is
already looking at. It rests as a single ✦ and opens on approach; five
marks, no picker, and what is sent rises through the middle of the
photograph and is gone in under three seconds. Nothing is kept. The event
log is where things are kept.

**All three step aside for the stage**, the way the guide does — matched by
attribute rather than class, because they live in their own CSS modules and
a class name written in `room.module.css` would hash to something none of
them wears. The exception is a chat line mid-sentence: taking the field
away would be taking the reader's words.

**The people column is not on the art** and is not bound by CONTRAST — it
keeps the shell's inks, with the class colour on the name only. It names up
to thirty and then counts, because a city is a number and a dungeon is a
guest list.

## The dressing room — settled

Built 2026-08-26 (docs/DRESSING.md). Press a gear slot on `/you` and a drawer
opens beside it — the rooms panel's own surface and position, one item wider,
because a row here carries an icon, a name and a number where a room carries a
name. It is the card, not a fourth ground.

**The press moved and the arrow became a button, off the card.** The card
opens the drawer, because a slot on a paperdoll means "change this". The
summons stands outside the card in the gutter, as a green pill carrying the
arrow and the number of upgrades behind it, and opens the gear those rooms are
holding.

That pill is **the one exception to "Controls — settled"**, and it is allowed
because it is not a new colour: the summons' green already means "better than
what you have, here" in the room's corner and on the rail. It is that meaning
with a number on it, drawn as the game draws a button — a lit face, a dark rim,
a shadow under it — because a control that opens something has to read as a
control. Nothing else on any surface may take this treatment; a second green
button is a second accent.

**The plate is on the sheet.** Hovering a row's picture or its name asks for
the game's own tooltip, the way it does in a room — a reader choosing between
two cloaks is choosing on numbers. It is asked for `quiet`: the game's half
only. The sheet holds the item dictionary and not the world, and the half of
the plate that says where a thing comes from belongs to the room that has it.
The row's name is the door there.

**A slot the reader dressed by hand wears a ring on its icon** — ink at `.55`,
the hollow tick's register. Not the accent: the pink is spent twice a screen
and nineteen slots is not twice. The count is carried in words instead, by the
letter's third line.

**The drawer's numbers are not scores.** The item level sits in the meta mono
at `.35`, right-set. No bar, no ring, nothing that ranks a row against the one
above it — the stage's rule, and for the same reason.

**What the app says about a character it says about the character on the
screen.** The plan is read by the doll, the slots, the letter, the arrows, the
room's kit and the stage, and every one of those either says so or is one
press from the sentence that does. A surface that reads the plan and does not
admit it is the app quietly describing somebody who does not exist.

## Open — the landing's answer is the default

**Motion continuity.** §11.3 wants the rail thumbnail to become the room
background. Not built. Until it is, room changes cut.

**The icon vocabulary.** The debuff glyphs exist (`components/Debuff.tsx`);
the aggro `!` is drawn now (`components/PinChip.tsx`, on the debuffs' 24
grid) and stands on the map as the pin marker. The fox mark is still
placeholder. Redraw what remains as one set, 1.5px stroke. STATUS §6.3.

**The pin — settled (2026-08-26, docs/PINS.md).** The pin's face is the
Seduced widget carried into the room (Kacey, explicitly): the glass chip,
the bar that fills and never drains — permanence made visible. The pin's
object is **the game's treasure map icon** (`INV_Misc_Map_01`) worn
everywhere the pin appears — map mark (hunt-mark frame), chip slot,
"Leave a pin" (Kacey: the app should feel like the world; familiarity of
the game's own objects over drawn vocabulary here — a ruled amendment to
§7.1 for this one marker). Outside PIN_BAND of the reader's level the
mark quietens to 0.55 and never hides. Hover is the chip, press is the
thread, the rail holds the composer; pressed marks ring in `--accent`,
which is within the rule above. The rail at rest is the room's pins as a
feed ("Left here.").

**Narrow.** Under 64rem the objects hide and the guide takes the width. That
is a placeholder, not a layout. The room has not been designed for a phone.

**Item quality colours.** The loot panel uses the game's four (green, blue,
purple, orange), lightened for the dark ground. They are the game's
language, not a second accent; they never leave an item name.

**A light surface anywhere.** There is no longer such a thing. If a settings
page or a profile ever needs one, it is a new decision and it starts here,
not with the tokens that used to be in this file.

**A screen with a few hundred words on it.** The command palette, the people
column and the guide cards are all ink-on-ground, which holds at the lengths
they run to now. The guide might outgrow it.

**Sound.** Someone enters; a pin lands. Optional, off by default. Not
started.

**Density.** The shell runs at 16px and the landing at 17px. Discord is 13px
everything and that is the thing to not be. Hold 16 until a real people
column with forty names in it says otherwise.

## What is forbidden

Per-room CSS. A ground that is not in the table above. A fifth face (the
plate's Arial is a quotation, not a choice). A second accent. The accent on a
plain button, a link or a heading. Swapping an item-quality colour or a
spell's school colour to the accent. A spinner. A hairline where a gap would
do — including the two that used to separate the shell's columns. Anything in
`globals.css` that only one surface uses. A row you drag with the mouse: the
landing's strip was a placeholder and it stays there, and in the app a set of
things is chips or it is a list. Naming a thing the reader is not allowed to
read yet.

Text-shadow for legibility is still forbidden as a *substitute* for the scrim
or a card. The rail's room name carries one, and that is the single exception
on either surface: it is a name on a photograph inside a panel, where there
is no scrim to stand in and no card to sit on.
