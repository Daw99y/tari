# The telling's card art

64×64 client icons, one per card, at `public/story/<room>/<icon>.png`. The
card's `icon` field in `reference/guide/<room>.json` names the file without its
extension. **A card with no `icon` still works** — it draws no tile, and its
rail slot wears a dot rather than an empty frame (Story.tsx). That is what lets
a room be written before its art exists, which is the order the next
seventy-five will have to be done in.

All four rooms have theirs. **Shadowfang Keep and Zul'Gurub were filled from
the wardrobe build** (`public/lab/doll/items/icons/`, gitignored) rather than
from the icon pack in `undiscovered` — that pack is roughly twice the size and
holds the creature portraits this one does not, so these are the best available
match rather than the best possible one. Anywhere below that reads as a
compromise is worth re-pulling from the full pack.

Title cards take no icon.

## Where these came from

Shadowfang Keep, Zul'Gurub and the five cities were filled from the **wardrobe
build** (`public/lab/doll/items/icons/`, gitignored — 1,179 icons of equippable
gear plus a few strays), converted webp → png. That pack has no creature
portraits, so some cards wear the nearest honest object rather than the right
one: the felsteed card wears fel fire, the war effort wears a bag.

The pack in `undiscovered/public/WoW Vanilla:Classic Icon Pack` is roughly twice
the size and holds what is missing. Anything below that reads as a stand-in is
worth re-pulling from there.

## The good ones, for reference

The matches worth keeping whatever else changes:

| room | card | icon |
| --- | --- | --- |
| shadowfang-keep | `pyrewood` | a pocket watch, for a curse that runs on a clock |
| shadowfang-keep | `odo` | an eye, for the lookout who cannot see |
| zul-gurub | `gahzranka` | a fishing pole, for the boss you fish up |
| zul-gurub | `edge-of-madness` | a stone tablet, for the tablet behind the brazier |
| zul-gurub | `the-heart` | an organ, for the Heart of Hakkar |
| stormwind-city | `masquerade` | a mask |
| stormwind-city | `prestor` | a dragon's head |
| stormwind-city | `the-vault` | a pocket watch, for the clock that stopped |
| ironforge | `tyrannistrasz` | a dragon's head, for the skull on display |
| orgrimmar | `ring-of-valor` | whirlwind, for an arena that never held a fight |
| darnassus | `tyrande` | a moonglaive |

## Still unwritten

Seventy rooms have no guide file yet and therefore no card art. Every one of
them has a **seed** (`reference/seeds.json`), so none of them opens empty.
