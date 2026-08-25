# Contrast — text on painted art

Decided 2026-08-25. Closes `docs/TARI.md` §15.2 / `STATUS.md` §6.2.

Measured, not guessed. All 77 room backgrounds in `public/journey/` were
rendered the way `room.module.css` renders them — 16:10 cover crop, the
grade, the three-layer scrim — and the luminance under the title and across
a 4×4 grid of the canvas was read off. The script is `scripts/contrast.py`.
Ink is `#f2f0ea` (luminance 0.87); the floor is WCAG 4.5:1, with 7:1 where
it costs nothing.

## What the measurement says

**1. The title is already safe. On every image.** The scrim you have puts
the bottom-left corner under ≥ 10:1 for all 77 rooms. Worst are Winterspring
(10.0), Alterac (10.8), Zul'Farrak and Dun Morogh (11.2). Do not make the
scrim heavier; it is done.

**2. The open canvas is not.** Outside the scrim, bare ink fails 4.5:1 on
part of most rooms and a lot of some:

| room | canvas where bare ink fails |
| --- | --- |
| Dun Morogh | 31% |
| Un'Goro Crater | 19% |
| The Stockade | 16% |
| Alterac Mountains | 14% |
| Westfall | 12% |
| Moonglade, Northshire | ~10% |
| Orgrimmar, Tirisfal | ~8% |
| everything else | 0–4% |

Snow, sky, and sun are the offenders, and they are always in the top half.

**3. Dark ink never works.** The art averages 0.02–0.22 luminance after the
grade. There is no image where dark text on the art passes anywhere. The
room is ink-on-dark, permanently. This is not a light/dark-mode question —
see the last section.

## The rule

Three surfaces, and every piece of text on the room belongs to exactly one.

### A. In the scrim — bare ink

The bottom 26% and the left 46% of the room. Text may sit directly on the
art with no backing. The title and its eyebrow live here; so will the
"since you were last here" line and the adjacency line. **Nothing bare goes
above the scrim.** Not a label, not a caption.

### B. On a card — anything else that is text

Guide cards, the loot panel, pin text, "what closes", the map plate's
legend. A card is the only thing allowed to carry text into the top half.

```css
.card {
  background: rgba(6, 6, 10, 0.86);
  backdrop-filter: blur(24px) saturate(1.1);
  -webkit-backdrop-filter: blur(24px) saturate(1.1);
  border: 0.5px solid var(--rule);
  border-radius: 12px;
}
```

`0.86` is the number. Against the brightest tile in the set (a sun shaft in
the Stockade, 0.60) it gives ink **6.8:1** and secondary text **4.6:1** at
the card mute below. Lower it and the Stockade fails; `0.80` is 5.6:1 for
ink and under 4:1 for mute. The blur is not decoration: it averages the hot
spots under the card toward the tile mean, so the real-world number sits
above the worst-case one.

Secondary text on a card uses a slightly stronger mute than the shell does:

```css
.card { --mute: rgba(242, 240, 234, 0.74); }   /* 4.6:1 on the worst tile */
```

### C. On a chip — pins, cursors, names

Single words on the art at arbitrary positions. Same ground as a card,
smaller, and always carrying a hairline so it reads as an object rather
than a smudge.

```css
.chip {
  background: rgba(6, 6, 10, 0.86);
  backdrop-filter: blur(12px);
  border: 0.5px solid var(--rule);
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
}
```

The pin *marker* (the aggro `!`) is a vector with its own dark outline and
needs no chip. The pin's *text* is a chip.

## What is forbidden

- Text-shadow as the contrast strategy. The title has one, and it is for
  edge definition, not legibility; the scrim is what makes it legible.
- A heavier or full-height scrim to "fix" a bright room. It would grey
  Dun Morogh to protect Undercity, which needs nothing.
- Per-room tuning. One scrim, one card, one chip. If a future room fails,
  the answer is a different crop (`object-position`) in `lib/rooms.ts`,
  never a CSS override.
- Anything below 4.5:1, measured at the p90 of the tile it sits on.

## The two columns are a separate question

The rule above is for **the room**. The rail and the people column are not
on the art and are not bound by it. They could be light — `TARI.md` §11.4's
"museum with a bar in it" — with the dark room punching through the middle.
The room stays dark either way, because the measurement says it must; the
frame is a taste decision, and it is still open.

## Re-running it

```
python3 scripts/contrast.py
```

Prints the table for every file in `public/journey/`. Run it when a room is
added or re-graded. If the worst title contrast drops under 7:1 or any
card-tile exceeds 0.60, the numbers in this doc move.
