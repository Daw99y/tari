# Writing a room — the method

**Fifty-seven of seventy-nine rooms are told. This is how the other
twenty-two get written.** Follow it exactly and the new rooms will match the ones that exist.

Read `docs/TARI.md` §6 first — the argument. This file is the procedure.

---

## 0. The rule that governs everything

> **Not more information. The 1% that is actually magic, extracted and made
> beautiful.**

Magazine, not encyclopedia. One strange true thing beats a complete boss table.
The test for any card: **would somebody say this out loud to the person standing
next to them?**

Never write: loot tables, strategy rotations, quest step lists, coordinates,
mob levels as a list, anything Wowhead already does exhaustively. §4.2 —
completeness is not the goal and there is no completion state.

---

## 1. Research first, always

Never write a card from memory. Vanilla is thirty years of accumulated retcons
and **the most confident-sounding facts are usually the Cataclysm version.**

Spawn one research subagent per room. The brief that works:

> Research **<ROOM>** in **WoW Classic / vanilla 1.12 ONLY** via
> warcraft.wiki.gg (CC BY-SA). Load WebSearch/WebFetch via ToolSearch if
> needed. Keep to ~5 wiki pages.
>
> CRITICAL: vanilla 1.12 only. <name the specific retcons that threaten this
> room>. Flag ANY fact you are not confident is vanilla-accurate.
>
> Editorial rule: **not more information — the 1% that is actually magic.**
> Magazine, not encyclopedia. One strange true thing beats a quest list. Things
> worth telling another player while standing there. NOT wanted: quest steps,
> mob tables, anything Wowhead does exhaustively.
>
> Return 12-14 CANDIDATE ENTRIES, best first, plain text. Each: SUBJECT · TAG ·
> 2-3 short factual lines · KIND (notice/look/story/before/beware) · SPOILER
> true/false · SOURCE URL · CONFIDENCE + why if not high.
>
> Prioritise: (1) surprising true things veterans miss; (2) the story of the
> place; (3) physical things to go and look at; (4) cut or unused content;
> (5) atmosphere.
>
> Also: whether the room had an older name or earlier form worth a "before"
> card, and the two natural ends of a walk through it.
>
> Prose/list only. No JSON, no files.

Run them in parallel, one call, several agents.

**Then use only the high-confidence entries.** Every agent so far has flagged
things it could not verify; every one of those flags has been correct to obey.
Medium confidence is usable if you soften the claim. Low confidence is not
usable at all.

Known traps, all of which have already bitten:
- **Shadowfang Keep** — Gilneas, Genn Greymane, Godfrey, Ashbury, Walden are
  all Cataclysm. Vanilla Arugal is Kirin Tor.
- **Mulgore** — no Grimtotem, no Camp Sungraze, no Bloodhoof flight master.
- **Darnassus** — no Malfurion beside Tyrande, no Exodar portal.
- **Any capital** — the Cataclysm rebuild is not this game.
- **Any raid** — check the vanilla boss list, not the modern one.

---

## 2. The file

`reference/guide/<room-id>.json`. Room ids come from `lib/rooms.ts`.

```
{
  "room": "<room-id>",
  "sources": [ "https://warcraft.wiki.gg/wiki/..." ],   // every page used
  "roadEnds": ["Back label", "On label"],               // the two ends of the walk
  "seedWho": "Tari",
  "cards": [ ... ]
}
```

A card:

```
{
  "id": "kebab-case",         // also the icon filename
  "kind": "notice|look|story|before|beware",
  "form": "title|chip|grave|yell|pages|six",
  "subject": "The thing's name, as the game spells it",
  "now": "Current name",      // TITLE CARDS ONLY, and only for a real rename
  "tag": "Short factual qualifier",
  "icon": "kebab-case",       // matches id; omit if no art
  "lines": ["Two or three short lines."],
  "spoiler": false,
  "t": 0.42,                  // position along the walk, 0 to 1
  "seed": { "body": "..." }   // optional, rare
}
```

### The rules that are not negotiable

- **10–13 cards.** Seventeen (Shadowfang) is the ceiling and it is too many.
- **First card is `form: "title"`, `kind: "before"`, no `t`, no `icon`.** It is
  what the place was before it was this.
- **A card renders at most ~8 lines.** The slot is sized for nine
  (`story.module.css`). Two cards once broke this and both were cut. If a card
  needs more room, the card is wrong.
- **`t` orders the deck.** It is a place in the telling, never a place on a map.
- **`at` is a map coordinate** and opens the map there. **Instances have no map
  — never give a dungeon or raid card an `at`.** Same for `road`.
- **`spoiler: true`** for anything that gives away an ending or a reveal. The
  reader lifts the veil by hand.
- **Sources are mandatory.** Every page the research used goes in the array.

### The rename

Only when the place was genuinely called something else. `subject` is the old
name, `now` is the name on the map. The pair is drawn **on the room's own title
at the top of the page** (`Room.tsx`), not on the card — a renamed room's title
card draws no heading at all. Never invent a rename to use the feature;
Zul'Gurub has always been Zul'Gurub and correctly has no `now`.

---

## 3. Wire it

`lib/guide.ts` — add the import (alphabetical) and the `GUIDES` entry. The key
is the room id, hyphens and all.

---

## 4. Icons

64×64 PNGs at `public/story/<room-id>/<card-id>.png`.

Source them from the wardrobe build at `public/lab/doll/items/icons/`
(gitignored, 1,179 files, named `icons_<blp>.webp`). Convert with PIL:

```python
from PIL import Image
Image.open(src).convert('RGBA').save(dst, optimize=True)
```

Search the pack by concept before choosing (`ls | grep -i skull`). It is
equippable gear plus a few spell and ability icons, so **it has no creature
portraits** — some cards will wear the nearest honest object instead. That is
acceptable. What is not acceptable is inventing a drawn icon: §7.1 keeps real
icons for content and hand-drawn vectors for UI vocabulary.

A card with no icon is fine — it draws no tile and its rail slot wears a dot.
Title cards never take one.

The bigger pack in `undiscovered/public/WoW Vanilla:Classic Icon Pack` (~2,023
icons, has the portraits) is the upgrade path when that repo is reachable.
`public/story/README.md` tracks what is a stand-in.

---

## 5. Verify

```bash
npx tsc --noEmit          # must be clean
```

`next build` cannot run over the Cowork bridge (it fails clearing `.next/`),
and the dev server must run in Kacey's own terminal. Load the room there.

---

## 6. What is left — twenty-two rooms

Written: alterac-mountains, arathi-highlands, ashenvale, azshara, badlands,
blackfathom-deeps, blackrock-depths, blasted-lands, burning-steppes,
darkshore, darnassus, desolace, dun-morogh, durotar, duskwood,
dustwallow-marsh, elwynn-forest, felwood, feralas, gnomeregan,
hillsbrad-foothills, ironforge, loch-modan, maraudon, moonglade, mulgore,
orgrimmar, ragefire-chasm, razorfen-downs, razorfen-kraul,
redridge-mountains, scarlet-monastery, searing-gorge, shadowfang-keep,
silverpine-forest, stonetalon-mountains, stormwind-city,
stranglethorn-vale, swamp-of-sorrows, tanaris, teldrassil, the-barrens,
the-deadmines, the-hinterlands, the-stockade, the-temple-of-atal-hakkar,
thousand-needles, thunder-bluff, tirisfal-glades, uldaman, un-goro-crater,
undercity, wailing-caverns, westfall, wetlands, zul-farrak, zul-gurub.

**Wave 5 — the endgame, the hubs and the raids (22)**
western-plaguelands, dire-maul-east, eastern-plaguelands, silithus,
winterspring, deadwind-pass, dire-maul-north, dire-maul-west,
lower-blackrock-spire, stratholme, scholomance, upper-blackrock-spire,
molten-core, blackwing-lair, ahn-qiraj, naxxramas, onyxia-s-lair,
ruins-of-ahn-qiraj, blackrock-mountain, gadgetzan, northshire, ratchet


**Six rooms per batch** is the working rhythm: six research agents in one call,
then write the six files, wire them, do the icons, run `tsc`, update
`docs/STATUS.md` §0.

---

## 7. Rules for the session doing this

- **Run no git command over the Cowork bridge, `status` included.** It takes
  `.git/index.lock` and the bridge cannot unlink it, which breaks Kacey's next
  commit. Read `.git/HEAD` and `.git/logs/HEAD` directly. Kacey commits from
  his own terminal.
- **The seeds are done.** All 79 rooms have one in `reference/seeds.json` and
  they are planted. Do not re-write them.
- **Do not touch** `app/lab/succubus/`, `app/(site)/`, `next.config.mjs` or
  `components/` without asking — Kacey works there in parallel.
- Read `docs/DESIGN.md` before changing anything visual. Most of it is settled
  and the settled parts say so.

---

## 8. The tooling, and the wave 5 plan

`scripts/telling/` holds the three helpers this method now runs on. Run them
from the repo root.

```bash
python3 scripts/telling/check.py wire <room-id> ...   # imports + GUIDES entries
python3 scripts/telling/icons.py < map.json           # webp -> png, see below
python3 scripts/telling/check.py check <room-id> ...  # validate (no args = all)
python3 scripts/telling/refresh-telling.py            # rewrites §6 from disk
npx tsc --noEmit
```

`check.py wire` inserts the import alphabetically and appends the `GUIDES`
entry, quoting the key when the room id has a hyphen. `check.py check` verifies
room id against `lib/rooms.ts`, card count, the title card, sources, `roadEnds`,
kinds and forms, `t` ascending, duplicate ids, absence of `at`/`road`, that
every named icon file exists and none are stray, that spoilers are graves, the
three-line limit, wiring, **and the ~350-character ceiling on `lines`**. It
prints `ALL GOOD` or names the fault.

Five rooms written before these rules hardened fail the check and are expected
to: duskwood (has `road` and `rares` icons), mulgore, shadowfang-keep (17),
undercity (15), zul-gurub (19). Leave them. Pass room ids to scope the check to
what you just wrote.

`icons.py` reads a JSON map on stdin: `{"<room>": {"<card-id>": "<blp_name>"}}`,
where the blp name is a file in `public/lab/doll/items/icons/` without the
`icons_` prefix or the `.webp`. List the pack with
`ls public/lab/doll/items/icons | sed 's/^icons_//; s/\.webp$//'` and search it
by concept before choosing. It refuses the whole batch if any source is missing.

**Wave 5, four batches:**

1. western-plaguelands, dire-maul-east, eastern-plaguelands, silithus,
   winterspring, deadwind-pass
2. dire-maul-north, dire-maul-west, lower-blackrock-spire,
   upper-blackrock-spire, stratholme, scholomance
3. molten-core, blackwing-lair, ahn-qiraj, naxxramas, onyxia-s-lair,
   ruins-of-ahn-qiraj
4. blackrock-mountain, gadgetzan, northshire, ratchet

Batch 4 is the four `place` rooms and is small; they are hubs and a mountain,
not dungeons, so expect fewer than thirteen cards each and do not pad.

**Traps for these rooms specifically**, on top of §1's list:

- **The Plaguelands** — Cataclysm rebuilt Andorhal and the Western Plaguelands
  outright, and the Argent Dawn was replaced by the Argent Crusade in Wrath. In
  1.12 the Argent Dawn is the faction and the whole Scourge story is unresolved.
- **Stratholme** — the Culling of Stratholme is a Wrath dungeon and is not this.
  Verify the vanilla live and undead sides, and the Baron's forty-five-minute
  timer for the mount.
- **Scholomance** — the vanilla layout is larger than the modern one, and
  Darkmaster Gandling's roster changed. Check the Skeleton Key and the Viewing
  Room.
- **Dire Maul** — three separate wings, added in patch 1.3.0. Tortheldrin, the
  Shen'dralar library, the tribute run in North, and the Feralas room already
  carries Eldre'Thalas from outside.
- **The raids** — check the vanilla boss list every time, never the modern one.
  Naxxramas was Eastern Plaguelands in 1.12 and moved to Northrend later.
  Ahn'Qiraj is gated behind the Scepter chain and the gong; ruins-of-ahn-qiraj
  is the twenty-man, ahn-qiraj the forty.
- **Blackrock Mountain** — the room is the shared exterior and the chasm, not
  any of the five instances hanging off it. Blackrock Depths and Burning Steppes
  already carry the two-sieges card; do not repeat it.
- **The hubs** — gadgetzan, northshire and ratchet are small. Stranglethorn,
  Tanaris, the Barrens and Elwynn already point at them from outside; check
  those files before writing so the cards do not collide.
