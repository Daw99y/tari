# Design — what has survived so far

Started 2026-08-25; v2 the same day, after the room. `TARI.md` §11.4 says this
file records only what the landing page set and the room kept. Every section
is marked **settled** or **open**. Settled means the code already does it and
nothing is allowed to drift from it. Open means the landing page's answer is
the default until a surface gives a reason to change it.

Add to this file when a second surface needs a thing. Not before.

## The register — settled

Museum with a bar in it. Light, generous, quiet, framed everywhere except the
one surface that isn't. The product is always shown inside a dark frame; the
page around it is white and says as little as it can.

Full-bleed exactly once. On the landing that is the hero; in the app it is
the room. Nothing else touches the edges.

Every section is one framed picture of the product and a headline, not a
paragraph about it. If a section needs body copy to make sense, the picture
is wrong.

## Colour — settled

Two grounds, and every surface is one or the other.

| token | value | where |
| --- | --- | --- |
| `--ground` | `#06060a` | the dark ground: hero, room, shell, every frame |
| `--ink` | `#f2f0ea` | text on ground |
| `--mute` | `rgba(242,240,234,.62)` | secondary text on ground |
| `--rule` | `rgba(242,240,234,.22)` | hairlines on ground |
| `--paper` | `#ffffff` | the light ground: everything below the hero |
| `--band` | `#f4f5f7` | alternating section ground; refusal cards |
| `--text` | `#0b0c10` | text on paper |
| `--text-mute` | `rgba(11,12,16,.56)` | secondary text on paper |
| `--text-rule` | `rgba(11,12,16,.1)` | hairlines on paper |
| `--seduce` | `#ff4f8b` | the accent. See below. |

The ink is warm, the paper is cool. That is on purpose: the dark frames read
as a different material from the page they sit on.

The first five live in `globals.css` because two surfaces share them. The
paper tokens still live in `page.module.css`. They move up the day a second
surface goes light.

Dark ink on the art never passes; the room is ink-on-dark permanently
(`CONTRAST.md`). The shell's rail and people column are dark too — decided
2026-08-25. The whole app is one ground; the paper is the marketing site.

### The accent

`--seduce` is the Seduction pink from the hero. It is spent, not used.

Allowed: the Seduced debuff, the pin marker, a pin or map spot the reader has
pressed, focus rings inside the room. Forbidden: buttons, links, headings,
the active rail room, anything that appears on every screen. If the pink is
on the screen, something has been noticed or chosen. Two places on a page
is the ceiling.

On paper the accent stays the same hex. There is no light-mode variant; it
only ever sits on the dark ground or on a dark frame.

## Type — settled

One family, system sans. `-apple-system, "SF Pro Text", Inter, "Helvetica
Neue"` for text; the Display cut for headings. No web font is loaded and
none will be until there is a reason a system face can't give.

| role | size | weight | tracking | leading |
| --- | --- | --- | --- | --- |
| h1 (hero) | `clamp(3rem, 7.2vw, 6.75rem)` | 600 | −0.045em | 0.96 |
| h2 | `clamp(2rem, 4.2vw, 3.5rem)` | 600 | −0.035em | 1.04 |
| room name (in a frame) | `clamp(1.6rem, 4vw, 3.4rem)` | 600 | −0.04em | 0.95 |
| lede | `clamp(1.05rem, 1.4vw, 1.35rem)` | 400 | −0.01em | 1.45 |
| body | `clamp(1.05rem, 1.3vw, 1.25rem)` | 400 | −0.01em | 1.5 |
| base | 17px on paper, 16px in the shell | 400 | | 1.5 |
| caption | 0.8rem | 400 | −0.005em | 1.4 |
| small print | 0.78rem | 400 | | 1.5 |

Mono (`ui-monospace, "SF Mono", Menlo`) is for eyebrows, meta and credits
only: 0.55–0.66rem, uppercase, tracked 0.14–0.2em, muted. It is never a
heading and never body.

Every h2 has two sentences. The second is the turn — muted, on its own line
(`.h2Mute`). Headlines are `text-wrap: balance`, body is `text-wrap: pretty`.

Antialiased, `optimizeLegibility`. Hairlines are 0.5px; on the 5K they are
real hairlines and that is the point.

## Space — settled

Section padding `clamp(6rem, 14vh, 11rem)` vertical, `clamp(1.25rem, 4vw,
3rem)` horizontal. Row gap inside a section `clamp(2.5rem, 5vh, 4rem)`. Copy
column 46rem, body column 34rem, both centred. Frames `min(100%, 72rem)`.

Sections alternate paper and band. No section rule, no divider; the band
change is the divider.

## Surfaces — settled

The frame: `--ground`, radius `clamp(14px, 1.6vw, 24px)`, 16:10 (21:10 wide,
4:5 narrow), a 0.5px ring at 12% and one soft shadow
(`0 30px 80px -30px` at 35%). One per section. The product is always shown
inside one; it is never drawn directly on paper.

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

## The canvas — settled

The room is a canvas, not a scroll, and it has four places. **Top, centred:
the name** — eyebrow and title, the way a gallery wall names a room.
**Bottom-left: reading** — the guide's placard and its chips, bare ink.
**Bottom-right: objects** — the cards, stacked, `min(21rem, 34%)` wide.
**Top-right: the compass**, which unfolds the map. The middle of the
photograph is empty on purpose. Anything new has to take one of the four
places or make the case for a fifth.

Small under large: a placard's eyebrow (mono, tracked) sits over its subject
(display, up to 4.75rem), then a one-line title, then two sentences. The
things that choose it (the chips) sit under it, never beside it.

## Controls — settled

One button. Pill, 0.5px border, 500 weight, `0.7rem 1.05rem`. On the art it
is glass: 30% ground, 12px blur, ink text. On paper it is solid ink with paper
text. Hover changes the border or the opacity, never the colour. Active
scales to 0.98. Focus is a 2px `currentColor` outline offset 3px.

A disabled or not-yet button reads as quiet text at 70%, not greyed chrome.

Rail rows are the landing mockup's card: `2.6rem` tall, radius 8px, the
room's photograph at 32% behind the name, a left-to-right dark gradient so
the name sits in the dark end. The current room brightens the art to 70%
and takes a 0.5px ring. No accent.

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
thread, the rail holds the composer; pressed marks ring in `--seduce`,
which is within the rule above. The rail at rest is the room's pins as a
feed ("Left here.").

**Narrow.** Under 64rem the objects hide and the guide takes the width. That
is a placeholder, not a layout. The room has not been designed for a phone.

**Item quality colours.** The loot panel uses the game's four (green, blue,
purple, orange), lightened for the dark ground. They are the game's
language, not a second accent; they never leave an item name.

**Paper inside the app.** Nothing in the shell is light today. If a settings
page or a profile needs paper, it uses the paper tokens above unchanged — the
question is only whether it should exist.

**Text on paper for the app's own chrome.** The command palette, the people
column and the guide cards are all ink-on-ground. Fine until a screen has more
than a few hundred words on it. The guide might.

**Sound.** Someone enters; a pin lands. Optional, off by default. Not
started.

**Density.** The shell runs at 16px and the landing at 17px. Discord is 13px
everything and that is the thing to not be. Hold 16 until a real people
column with forty names in it says otherwise.

## What is forbidden

Text-shadow for legibility. Per-room CSS. A third ground. A second font
(the plate's Arial is a quotation, not a font choice — see "The plate").
A second accent. Pink on a button. A spinner. A border where a band change
would do. Anything in `globals.css` that only one surface uses. A row you
drag with the mouse — the landing's strip was a placeholder and it stays
there; in the app a set of things is chips, or it is a list. Naming a thing
the reader is not allowed to read yet.
