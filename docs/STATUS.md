# Tari — status and handoff

Updated 2026-08-31 (late).

**This doc holds the state. `docs/TARI.md` holds the argument — read its §0
before anything else.**

Both docs now live in this repo and **the repo copy is canonical.** They were
previously only inside a Claude project, which meant no local session could
see them. Earlier references to `FOXTON.md` mean `docs/TARI.md`.

---

## 0. Latest — the card, the envelope, the follow, 2026-08-31 (late)

**Three of `WELCOME.md`'s open rulings are settled and the welcome is one piece
from finished.** Kacey ruled all three in one pass:

| ruling | settled |
| --- | --- |
| §11.1 leaderboards | **places, never players.** The landing's *"nothing here ranks you against anyone"* stays and is now permanent. A player ranking is a thing WELCOME.md forbids. |
| §11.2 does the addon read live state | **no, and it cannot.** See below — this one deleted a feature and rewrote a refusal. |
| §11.3 push before or after Tauri | **neither, yet.** The opt-in ships now, everything lands in the envelope, push is a later delivery swap rather than a second feature. §3 is unblocked without step 8. |

### The correction that mattered most

**The addon and the armory read nothing live.** Kacey, and it is worth writing
plainly because two shipped surfaces were built on the opposite assumption: the
addon writes an export string a reader copies out of the game and pastes in;
the armory answers as of last logout. **Both are photographs.** Nothing in this
product knows where a reader is standing or whether they are playing.

Two things had already been written that quietly claimed otherwise:

- **§3.1's refusal**, *"Tari never rings while you're playing"*, was conditional
  on the addon knowing combat and instance state. It knows neither. The line is
  re-cut to **"Only Azeroth. Never Tari, never a streak, and never at 3am."** —
  three things enforced by the list and by delivery rather than by intention.
- **The kit's fishing card** promised *"We'll say something when you're near
  water worth sitting at."* Deleted from `reference/kit.json`; the card's second
  line is now *"Nobody has ever regretted the ten minutes."*

And the best line on the notification list — *"when I'm near water I've never
sat at"* — is **deleted rather than parked.** A toggle that can never fire is
worse than an absent feature: the reader ticks it, waits, and learns the app
makes things up. `lib/nudge.ts` carries the whole correction in its header and
a **sixth rule** for §3.2: *it must be knowable without the reader.*

**The upside is bigger than the loss.** Every remaining thing is a fact about
Azeroth on a calendar — the Faire moving, the week turning over, a full moon, a
seasonal event opening — so the nudge needs no addon, no armory, no client and
no account to be true, and it works for a signed-out reader on a borrowed
laptop. That is what makes them *real* notifications rather than promised ones.

### The card — `/you`, bottom right

An Azeroth banking card, cut to ID-1 proportions (1.586:1, the ratio every card
in every wallet is cut to — get it wrong and the object stops reading as a card).

- **Front is identity**: the fox as issuer, the faction crest, the character's
  name embossed in the class colour where a cardholder's goes, `17 · UNDEAD ·
  ROGUE` spaced like an account number, the race portrait and class disc where
  the network mark sits. Hover lifts it and fades up the small print.
- **The chip is the import and only the import** — gold when the character came
  from the armory or a paste, grey when it was made by hand. Its wording is
  careful for the reason above: it does not mean "connected", because nothing
  is connected.
- **Back is the settings**: the magnetic stripe, the re-cut refusal printed on
  the object rather than kept in a document, the four things to be told about,
  and the door.
- **The box never changes size.** It briefly grew taller to fit the back and
  Kacey caught it: proportions are the whole reason it reads as a card. The
  list scrolls inside a fixed box instead — **no scrollbar and nothing drawn to
  replace one**, just a `mask-image` fade at both edges, which is the only
  language a physical object has for "there is more".

**It broke twice on the way and both are worth keeping.**

1. **Removing the grow-when-flipped rule took `.face` and `.rear` with it** —
   a block cut by index that ran further than intended — so
   `backface-visibility` went with them and both sides rendered on top of each
   other. Cutting CSS by index is how that happens; the rules are back and the
   comment above them says which three declarations only work together.
2. **The face was a grid with four absolutely-positioned things over it** —
   crest, chip, hover print, flip button. That holds at exactly one size and
   collapses at every other, which is what Kacey photographed: the name, the
   small print and the button stacked on each other. **Nothing on either face
   is absolutely positioned now.** Both are ordinary grids whose rows add up,
   the hover print is gone (its "member since" just lives on the holder line,
   where a card prints it anyway), and the flip button has a reserved cell so
   revealing it moves nothing.

**And a third, found while fixing them: the card had a viewport media query on
a surface laid out by a container query.** Under `@container stage (max-width:
64rem)` the sheet drops to two columns, so a card parked in `grid-column: 3`
sat in a 0px track — it collapsed to nothing at a 1400px window, which is not a
width anybody would have thought to test. It follows the facts to the foot of
the stacked page now rather than hiding, because the back of this card is the
only place the notification settings exist.

**The back's chrome is on a budget and the numbers are the budget.** In the
wide layout the card is 232×146 — a real card at real size, and small. The
first cut left one of four rows visible. The stripe, promise and signature are
tuned so three stand and the fourth is a flick away under the mask; the comment
on `.rear` says to re-check the list if any of them change.
- **The small print moved to a status line** at the foot that reads whatever
  row you are pointing at. That is WoW's own pattern — the game explains the
  button under your cursor in one fixed strip rather than beside every button —
  and it is what let each row stay one line.

### The envelope — top left, beside the mark

`lib/envelope.ts` · `app/api/envelope/route.ts` · `app/(app)/Envelope.tsx`.
Kacey moved it out of the actions on the right: the kit and ⌘K are things you
go and do, and the envelope is the one item in the shell that can change while
nobody is looking at it.

- **The mark carries no number.** A dot, in the accent, saying *something* or
  *nothing*. A bold count on an envelope is the oldest engagement device on the
  internet — it exists to make the unopened feel owed — and §13 refuses it for
  exactly the reason it refuses a follower total.
- **It never polls.** Once on mount and again when you open it. A mailbox that
  polls is a mailbox trying to get your attention.
- **Opening marks everything seen**, and nothing is ever deleted — it falls out
  of the bottom at fifty. An inbox you are expected to clear is a chore.
- Not drawn at all without an account: there is no address for anything to be
  sent to, and an empty envelope offered to a stranger is an advert for signing
  in.

### The follow — `lib/follow.ts`, and a missing index

**§7's refusal is written as an absent database index.** `db/schema.sql` has no
index on `follows.followed`, because an index that way round exists only to
count or list the people following somebody — and the comment there says so, so
that adding it later cannot happen by accident. There is no `countFollowers`,
no route returning who follows you, and no list of who you follow. The entire
surface is **one boolean on the pins a room was already reading**: following
changes how a place looks, never what page you are on.

You follow **a pin, not a user id** — no user id is ever sent to or returned
from a browser, so there is nothing to enumerate — and unfollowing is a real
delete rather than a tombstone, the one place in the product where that is
right.

### Plumbing

- `db/schema.sql` — `notices`, `follows`, `users.prefs`. Until it is run the
  three routes degrade to empty, which was verified.
- **`scripts/migrate.mjs` — `npm run migrate`.** There is no `psql` on a stock
  Mac and no reason to install one: `pg` is already a dependency and speaks the
  same protocol. It loads `.env.local` the way `seed-pins.mjs` does, runs
  `db/schema.sql` **in one transaction** so a half-applied schema is not a
  state that can happen, and prints the tables afterwards — "it ran" and "the
  tables exist" are different claims and only the second is useful. Safe to run
  as often as you like: the repo's additive-only rule (§7) is what makes the
  whole file idempotent. `--dry` shows what it would do. **Run from Kacey's
  terminal; the bridge has no egress to Neon.**
- **Applied 2026-08-31.** `characters, events, follows, marks, notices, pins,
  users, waves` and `users.prefs: present`. All four routes then answered
  against the real tables, and `/r/duskwood` still draws its pins — the follows
  subquery `lib/pins-db.ts` grew is the riskiest change in this pass and it is
  the one that had to be checked against a live table rather than reasoned
  about.
- **The `pg` SSL warning is noise for now** and `scripts/migrate.mjs` says why:
  `sslmode=require` is currently treated as the *stricter* `verify-full`, and
  pg v9 will switch it to the weaker libpq meaning. Nothing to do today; on a
  pg v9 bump the string wants `verify-full` spelled out, here and in
  `lib/db.ts`, or the deploy quietly drops to a weaker check.
- A reply now posts a notice to the pin's author (`app/api/pins`), never to
  yourself, and a failed notice cannot fail the pin.
- `lib/ago.ts` is new and small: `age` had to leave `lib/live.ts` because that
  file imports the pool, and a client component wanting the formatter pulled
  `pg` into a browser bundle and broke the build. `live.ts` re-exports it, so
  no existing caller changed. **This is the trap `lib/sync.ts` warns about and
  it caught us anyway.**

### Verified in the browser

Card front and back at 1.586 both ways, size unchanged across the flip, the
scrollbar suppressed and the mask applied, the status line reading all four
rows and returning to rest, and `/api/envelope`, `/api/prefs` and `/api/follow`
all degrading correctly while signed out and un-migrated — no 500s.
`npx tsc --noEmit` clean.

**Still to do on this:** the follow has a working API and no button on a pin
yet, and the almanac (§5) is now the only piece of the welcome unbuilt.

---

## 0.01 Earlier — Rested, and the landing is rebuilt, 2026-08-31 (night)

**Rested is built.** `docs/WELCOME.md` §4 — the §7 inversion applied to the
growth mechanic, and the third of the welcome's five pieces to land after the
kit and the seeds. Time away is what accrues: walk back into Duskwood after
nine days and the room says so, and the longer you were gone the longer the
sentence. Nothing is defended and nothing can be broken.

- `lib/rested.ts` — the shapes and the sentence, no pool and no browser, the
  same division `lib/sync.ts` keeps because both ends import it.
- `app/api/rested/route.ts` — the read. **This is the query `lib/live.ts` has
  been describing in its own header since it was written**: *"without accounts
  there is no 'you' yet ... the account cursor lands on the same query the day
  it exists."* Three counts since a cursor — who came through at your level
  (§4.3's ±2 band), what was left here, and what was said back to you.
- `app/(app)/Rested.tsx` — the surface, in the people column at the foot of
  it and over the doors. **Kacey moved it there mid-build and it was the right
  call.** It was written as a card floating on the art, which made it a fifth
  thing competing for a corner of a photograph that had run out of corners —
  it landed on the deck switch, and at anything under about a thousand pixels
  it met the room's own centred name. The column already asks *who is here* at
  the top and *where can you go* at the bottom; what happened while you were
  gone is the same question asked about a time rather than a place, and it
  belongs between them. It needs no card, no scrim and no breakpoint there:
  the column is not on the art, so docs/CONTRAST.md does not bind it.
- `.rested` takes the `margin-top: auto` the doors were carrying, so a drawn
  Rested consumes the column's air instead of adding a block to it. Nothing is
  drawn far more often than something is, and the quiet column is unchanged.

**Every line wears an object.** It shipped as a flat paragraph and Kacey asked
for the pin's icon on the pin line, which was the right instinct and the
register already required it: DESIGN.md's *the product shown as working
objects*, and Kacey's own 2026-08-26 rule that the more of the game's own
objects the better. So the sentence became a lead and three rows, each in the
`--r-sm` well `PinChip` and the trainer rows already use:

| row | object | why that one |
| --- | --- | --- |
| new pins | `/pins/map-x.png`, straight off `PinFace` | the treasure map the pin wears everywhere else, imported rather than copied so the two cannot drift |
| came through | `inv_misc_grouplooking` | the game's own Looking For Group icon — the one vanilla icon meaning *other players* without meaning a class or a faction, and a crowd has no class colour |
| a reply | `inv_letter_15` | §3.3 already calls the in-app channel the envelope and WoW's mail icon the softest notification ever designed; a reply waiting for you is the letter, in the game's own hand |

**The lead wears none**, deliberately: the days are the one line about you
rather than about the room, and they are the only number in the product set in
`--ink`. That is the inversion said in a colour — the figure a streak would
have made you defend is the figure Rested makes the headline, and it got there
by you being somewhere else.

**Four candidate icons 403 or fail on the CDN** and were checked in the browser
before being chosen, not after: `inv_misc_footprints`, `ability_tracking`,
`ability_rogue_sprint` and `spell_holy_prayerofhealing` are all absent from
`render.worldofwarcraft.com`. Anything added here wants the same check —
`lib/spell-icons.ts` has the same note, and a missing stem is a broken image
rather than a fallback.

**The cursor is a `been` mark**, subject the room id and `val` an ISO time, so
it is localStorage-first and syncs only for a reader who signed in. A signed-out
reader gets Rested on the machine they read on, which is the right degradation
— the alternative is a growth mechanic that needs an account, and that is the
shape §0 refuses. `valOf` in `lib/marks.ts` is the one export it needed: `isOn`
throws away the value, and "here, at no time" is not a state a `been` mark can
be in.

**What kept it from being a streak in a costume** (§7.1's test):

- Every count is measured from a cursor and **dies the moment it is read**. It
  describes an absence, cannot be accumulated, and has no version that only
  goes up.
- **Nothing is drawn when nothing happened.** §5.2 — it renders what you have
  and never what you haven't. No "0 came through", no empty card.
- **No dismiss.** There is nothing to close; the card is gone next visit by
  construction, because the cursor it was measured from has moved.
- **The sub-place came off.** §4's sketch ends *"Two new pins near Raven Hill"*
  and the landmark is dropped: a count of what people left is news about a
  room, the same count with a landmark on it is the first line of a route, and
  §2.1 does not stop applying because the sentence is friendly.
- The stamp lands **after** the read, always — stamping on arrival spends the
  absence before it is drawn — and is skipped if the cursor is under five
  minutes old, so walking the rail through six rooms is not six writes.

**Open ruling §11.5 is half-settled.** Rested is in the room's column, per
TARI.md §4.3 band 2. Whether it *also* speaks in the letter on `/campfire` is
untouched and still open. The heading is the only place the word is said —
"Well rested" past seven days, "Since you were last here" under — and there is
deliberately no badge and no threshold to cross.

**Verified against the real thing**, driven in Kacey's dev server with a
back-dated `been` mark:

| | |
| --- | --- |
| duskwood, cursor nine days back | **Well rested · "Nine days." · the pin row, wearing the map** |
| the same room, straight after | nothing drawn, cursor untouched |
| westfall, never stood in | nothing drawn, cursor planted |
| a malformed, future, or unknown-room cursor | `rested: null`, three for three |

The three queries ran against Neon and the pin count is real. `came` came back
zero at every level over a ninety-day window, which is the event log being
quiet for that room rather than a broken query — the read returned a valid row,
so the SQL parsed and ran. `npx tsc --noEmit` clean; the sentence builder was
also run against five shapes including §4's own example, which it reproduces
word for word.

**The landing rebuild is recorded here for the first time.** Two commits this
evening that no §0 had caught: `feat(landing): the mocks are the app, framed`
and `feat(landing): the armory door, the campfire, the board, and a banded
flow`. The page is now nine tone-banded sections — the point, live rooms, the
armory door, your character, the campfire, the deck, the world, classic+ as the
page's one band, and the promises.

**§8.1's leaderboard ruling is now the oldest thing blocking the welcome.**
*"No leaderboards. Nobody wins Tari"* has to come off the landing page before
launch, not when a leaderboard ships, and the page was just rebuilt around
those lines. Kacey's call: places or players.

## 0.02 Earlier — the path is built, 2026-08-31

**`/campfire` exists: the trainer, the chains, the class quests and the letter.**
Whelp plz's four reader-facing tabs are one page, per `docs/CARRYOVER.md`
§The path, which has the rulings and what is still open. The letter moved off
`/you` and the rail's foot chip is split in two. Data copied from CPLUS into
`reference/training/` and `reference/journey/`; `lib/journey.ts` reads it;
ticks are `done` marks on whelp plz's own subjects. `npx tsc --noEmit` clean,
driven in the browser at 800 and 1440 wide.

**The import credits it.** `S:` (the spellbook) and `Q:` (the quest log) have
been parsed since `lib/import.ts` was written, and `matchImport` has been sat
in that file unused waiting for the catalogue `lib/journey.ts` now builds.
Pasting a string ticks the trainer visits, class quests and profession
milestones it proves, so a levelled character does not arrive at forty
unticked boxes. Two creator bugs fell out of testing it and are fixed: a
string with no `A:` race token left a Horde character on whatever race the
picker was showing (the faction is now taken from the string, and the race
inferred from the languages in `P:` — a 1.12 character knows their faction's
language and their own, so the other one names the race); and the credit is
awaited before the creator navigates.

**The addon moved to TA2** (`addon/Tari/`, 0.2.0) with two fields: `L:` the
quest log in progress and `K:` every talent's rank. Nothing is on CurseForge
yet so the format was free; the tail is keyed and TA1 strings still read.
`L:` is what lets `/campfire` tell a chain you are walking from one you have
never touched. **Kacey's installed copy is older than the repo's** — the
2026-08-31 string carried no `A:`, `X:`, `Z:`, `H:` or `U:` — so it wants
reinstalling from `addon/Tari/` before the new fields will appear.

**Not built:** the room's half of the carry-over — the trainer's card inside
the city room, an attunement step inside the instance room — which needs the
`room`/`entry` reshape. Every row on `/campfire` that names a place is already a
door into it, so the page does not wait on that.

**Room-telling is paused at 63/79.** `docs/TELLING.md` §8 still has the
sixteen and the method; nothing about it changed this pass.

## 0.05 Earlier — every room is told, 2026-08-31

**All seventy-nine rooms have a guide file. The telling is finished.** Four
wave 5 batches went in this run by `docs/TELLING.md`'s method: six research
agents per batch in one call, wiki-only (CC BY-SA), vanilla 1.12,
high-confidence entries only.

**999 cards and 925 icons under `public/story/`.** `npx tsc --noEmit` clean.
`scripts/telling/check.py check` passes for every room written to the hardened
rules — the only failures are the five known pre-hardening rooms (duskwood,
mulgore, shadowfang-keep, undercity, zul-gurub), which are expected and
documented in §8.
**Nothing is committed** — no git command was run over the bridge, per §7.

- **Wave 3 (17)** — darkshore, loch-modan, silverpine-forest, westfall,
  the-barrens, ragefire-chasm, the-deadmines, redridge-mountains,
  stonetalon-mountains, ashenvale, wailing-caverns, hillsbrad-foothills,
  wetlands, blackfathom-deeps, razorfen-kraul, the-stockade, thousand-needles.
- **Wave 4 (22)** — gnomeregan, alterac-mountains, arathi-highlands, desolace,
  stranglethorn-vale, scarlet-monastery, badlands, dustwallow-marsh,
  swamp-of-sorrows, razorfen-downs, uldaman, feralas, tanaris, the-hinterlands,
  searing-gorge, zul-farrak, azshara, blasted-lands, maraudon, felwood,
  un-goro-crater, the-temple-of-atal-hakkar.
- **Wave 5 (25)** — blackrock-depths, burning-steppes and moonglade opened it;
  then four batches. Batch 1: western-plaguelands, dire-maul-east,
  eastern-plaguelands, silithus, winterspring, deadwind-pass. Batch 2:
  dire-maul-north, dire-maul-west, lower-blackrock-spire,
  upper-blackrock-spire, stratholme, scholomance. Batch 3: molten-core,
  blackwing-lair, ahn-qiraj, ruins-of-ahn-qiraj, naxxramas, onyxia-s-lair —
  every raid in the game. Batch 4: blackrock-mountain, gadgetzan, northshire,
  ratchet, at 11-12 cards rather than 13 because they are hubs and a mountain.

**What is left is not writing.** `docs/TELLING.md` §6 now says so directly:
revision of the five pre-hardening rooms, the icon upgrade path in §4, and the
photography in `docs/TARI.md` §6.2 — for which the shot list is now complete
and is every "go and look at this" card in the guide.

**What the four batches learned:**

- **Check the neighbour's file before writing.** This mattered more than
  anything else, and it is why the raids have any content at all. Feralas
  already carried Dire Maul's 1.3.0 arrival and Tortheldrin; Tanaris carried
  Anachronos at the gates; Blackrock Depths carried the Grim Guzzler; Stormwind
  and Dustwallow both carried Lady Katrana Prestor; Silithus carried the Scarab
  Gong and the ten hours; Elwynn carried Northshire Abbey. Every one of those
  cards was cut from the new room instead of repeated, which forced each new
  file onto material nothing else had.
- **The agents corrected the brief roughly a dozen times.** Darkwhisper Gorge
  is the Legion in 1.12; the Karazhan Crypts five-man is Season of Discovery;
  Grand Magus Doane is Redridge and Cataclysm; both Spires are ten-man and
  never five; Stratholme's Slaughter Square opens on the Ash'ari Crystals;
  Gandling needs six deaths first; Molten Core had no summoning stone and no
  real attunement; C'Thun was fixed by unlisted hotfixes over four months;
  Naxxramas ran six to seven months, not nine; vanilla has six starting zones,
  not eight; and there is no Gadgetzan-to-Everlook teleporter.
- **They also killed things that do not exist.** No "Ogre Warbanner" in LBRS,
  no "Blackhand Doomsaber", no "Frostwhisper's Embalming Fluid", no Rexxar in
  the Horde Onyxia chain (Rokaro), no Ratchet auction house in 1.12, and Rajaxx
  never says "Why have you forsaken the Might of Kalimdor?"
- **Refuse the unsourced number.** The famous "only one percent of vanilla
  players cleared Naxxramas" has no primary source and is not printed. Neither
  is the Alliance name for the Onyxia head turn-in, because the wiki gives
  Varian and Varian is not in Stormwind in 1.12.
- **Eastern Plaguelands is wave 5's only rename** — the Eastweald — and so the
  only new room carrying a `now` on its title card. Where no old name is
  attested, none was invented.
- **The tooling did the whole mechanical half.** `check.py wire`, `icons.py`
  and `check.py check` across all four batches, with no hand-editing of
  `lib/guide.ts` at any point.

**The method is now tooled.** `scripts/telling/` holds the wire, icon and
validate helpers this run was built on, and `docs/TELLING.md` §8 documents them
plus the four-batch plan for wave 5 and the traps specific to those rooms. A
fresh session should read `docs/TELLING.md` and `docs/TARI.md` §6 and be able to
carry on without asking anything.

**What this pass learned, for whoever writes wave 5:**

- **The measured ceiling is real and it is ~350 characters of `lines`.** No card
  in the first fifteen rooms exceeds it. Ten cards had to be trimmed after
  writing before they came in under. Write to three short lines and check the
  total before wiring. `tari-tools.py`-style validation (card count, title card,
  `t` ascending, icons exist, spoiler⇒grave, the char cap) catches all of it.
- **Obey the agents' confidence flags.** Every one this run was right. Cut on
  their advice: the Kodo Graveyard (Desolace, not the Barrens), the Lordamere
  Internment Camp (Alterac, not Silverpine), the Doomsday Candle (warlock mount
  chain, nothing to do with Neeru), Westfall Stew (surviving text is the
  Cataclysm rewrite), Danath holding Stromgarde (he is lost in Outland),
  gorillas in the Hinterlands (there are none), Malfurion visible in Moonglade
  (no NPC model in 1.12), and Moonglade being a sanctuary (that flag is TBC).
- **Several agents corrected the brief, not the other way round.** Maraudon is
  patch 1.2.0, not 1.4; Dire Maul is 1.3.0, not 1.6; Twilight Lord Kelris is an
  orc; Blackfathom has a seventh boss (Old Serra'kis); Keeshan *is* an NPC in
  1.12. Write the brief with the traps you know and let them find the rest.
- **`now` was used once**, correctly: Black Morass → Swamp of Sorrows. No other
  room in these thirty-six had a real rename.
- **Icons are wardrobe stand-ins throughout**, converted webp → png out of the
  gitignored doll build. The pack still has no creature portraits, so Bazzalan
  wears a monster head and Mankrik's wife wears a skull.
  `public/story/README.md` is unchanged and still the record of what is a
  compromise; it is worth a re-pull from the bigger pack before launch.
- **No `at` and no `road` on any of the thirty-six.** Instances get neither by
  rule; the zones carry `roadEnds` and `t` only, matching the fifteen already
  written.

---

## 0.1 Earlier — wave 3 opens, 2026-08-30

**Twenty-one of seventy-nine rooms are told.** Six more written this pass, the
first batch of `docs/TELLING.md`'s wave 3 — the 10–30 band and the dungeon
that hangs under Orgrimmar. Six research agents in parallel, wiki-only
(CC BY-SA), vanilla 1.12, then the method's file shape unchanged.

- **darkshore** (12) — the twin cities on the shore of the Well of Eternity;
  Blackfathom Deeps sat in the Ruins of Mathystra until patch 0.12 and was
  moved out, which is why the zone has no dungeon at all; the Twilight's
  Hammer is already at the Master's Glaive in a level-20 quest deleted in
  4.0.3a; Soggoth's skull and the sword nobody dares pull out.
- **loch-modan** (12) — the loch is more than half artificial and the Wetlands
  is its overflow; the troggs were dug up by the dwarves' own excavations;
  the Farstrider Lodge has no flight master until Cataclysm; the Stonewrought
  Dam was drawn by the Dark Iron clan's own chief architect.
- **silverpine-forest** (12) — the worgen here are Arugal's, not Gilneas's,
  and in 1.12 the Greymane Wall has nothing behind it; Sons of Arugal are
  24–25 elites loose in a 10–20 zone; Deep Elem Mine is named after a Grateful
  Dead song and led by its own former foreman.
- **westfall** (12) — the fields were salted on purpose; Sentinel Hill is a
  tower and Stoutmantle is a Captain of the People's Militia, both of which
  later games overwrite; Old Blanchy is alive; the lighthouse keeper tells you
  he is dead.
- **the-barrens** (12) — one contiguous zone, split in two by 4.0.3a; Barrens
  chat as documented rather than as remembered; the corpse on the ground reads
  *Beaten Corpse* and not her name, which is the whole reason the question
  entered general chat and never left.
- **ragefire-chasm** (11) — the first dungeon in the game, under the auction
  house, and the man who sends you in is Shadow Council and Thrall knows;
  Taragaman is bait; the last boss is on a ledge most groups never look at;
  Zelemar is patch 2.0.3 and is not here.

**Method notes for the next batch:**

- **Six cards had to be trimmed after writing.** The measured ceiling is real:
  no card in the fifteen written rooms exceeds ~350 characters of `lines`, and
  the slot in `story.module.css` is sized for nine rendered lines. Write to
  three short lines and check the total before wiring.
- **Every agent's low-confidence flags were correct to obey again.** Cut on
  their advice: the Barrens Kodo Graveyard (it is in Desolace), the Lordamere
  Internment Camp (Alterac), the Doomsday Candle (warlock mount chain, nothing
  to do with Neeru), Westfall Stew (the surviving quest text is the Cataclysm
  homeless-camp rewrite), Gold Coast Quarry and the Valley of Kings.
- **Icons are wardrobe stand-ins as before** — 65 new PNGs under
  `public/story/<room>/`, converted webp → png from the gitignored doll build.
  The pack still has no creature portraits, so Bazzalan wears a monster head
  and Mankrik's wife wears a skull. `public/story/README.md` is unchanged and
  still the record of what is a compromise.
- **No `at`, no `road` on any of the six.** Ragefire is an instance and gets
  neither by rule; the five zones carry `roadEnds` and `t` only, matching the
  fifteen already written.
- `npx tsc --noEmit` clean. **Not committed** — Kacey commits.

---

## 0.2 Earlier — two decks on one table, 2026-08-30

**The middle of every room is answered.** Two rooms out of seventy-nine have a
guide file. The other seventy-seven drew a photograph, a name at the top and
nothing across the middle, which read as a loading screen rather than a
decision — and was the single biggest reason the app felt unfinished. A room
with no guide now draws **the deck of what people left there**: the guide's own
deck with the cards coming from readers instead of from a file, so a written
room and an unwritten one are the same object rather than a thing and a
placeholder for it. `docs/DESIGN.md` — *Two decks, one table* and *The
unwritten room*, both settled.

- **The guide became a deck** (`Story.tsx`, `story.module.css`). One card stands
  still on the room's art, two sleeves of the deck peek out from under it, and a
  rail of the encounters' own client icons runs underneath, every one a door.
  The road still orders it west to east and the two words that turn it are the
  road's own ends. The spoiler shield is a veil on the words alone.
- **Undercity** (`reference/guide/undercity.json`) — the second deck, fifteen
  cards, and the first city. `lib/guide.ts` now carries five kinds and six
  forms, including `six`, the rares' roll-call.
- **The switch is the game's action bar** (`Decks.tsx`, `decks.module.css`).
  Three slots — **The telling · Left here · Just the room** — each a client icon
  in the client's own button: a tome, the pin's treasure map, and Vanish. It
  holds the top-left corner, opposite the compass; that corner was the one part
  of the photograph nothing had claimed. Both decks stay mounted and the
  inactive one is hidden, so the room's pin channel is still listening while you
  read the guide.
- **A pin no longer needs a spot** (`docs/PINS.md`, rewritten). Thirty-three
  rooms have no map plate and never will — every dungeon, every raid, four hubs
  — and under a required `x`/`y` they could not hold a single pin, which put the
  product's own atom out of reach of exactly the places a warning is worth most.
  Two doors onto the same record now: the map's composer, and the room's card
  stack. `onTheMap(pin)` is the one test. **`db/schema.sql` carries two
  `alter table pins alter column … drop not null` lines — run them against Neon
  before this deploys.**
- **The armory import** (`lib/bnet.ts`, `app/api/armory/route.ts`). Battle.net
  Classic profile lookup, namespace `profile-classic1x-{region}` — Era, Hardcore
  and SoD — cached five minutes, server-only. **Two new env vars:
  `BNET_CLIENT_ID`, `BNET_CLIENT_SECRET`.** A stranger becomes a character in
  ten seconds with no download, which makes this the front door and the addon
  the thing you are invited to later. Anything promised only by the addon has to
  degrade for armory-only readers.
- **Moments** (`Moments.tsx`, `moments.module.css`). §8's "someone dings 60 and
  it crosses every screen", built by hand while the addon catches up. Five
  marks, no picker. A mark rises through the middle of the photograph on
  everybody's screen at once and is gone in under three seconds: no history, no
  count, nothing to scroll — a room reacting, not a room recording. The ding
  lands on this same channel the day the addon can post it.
- **The landing went playful and shows the product 1:1.** The rogue stands in
  Hillsbrad and notices your cursor (`HeroScene.tsx`, `SeducedFigure.tsx`, the
  shopping list baked into one 3 KB file); the guide drifts past on an endless
  band; the pin steps back from the story card; the door wears Discord's face
  and knows who already opened it. `fix(m2)`: global sequences run on their own
  clock.
- **`design/app-matches-landing`, merged fast-forward.** One vocabulary across
  both surfaces and **the accent is green**. Three panels on a table in the
  shell; the compass turned with it; the foot of the rail stopped saying "You"
  and shows you — the client's own race portrait, the class disc on its
  shoulder, the name in the class colour, and under it the sentence the
  character screen has printed since 2004 (`You.tsx`). The sheet's nineteen
  blank squares became a paperdoll. `docs/DESIGN.md` rewritten through: register,
  colour, type, space and shape, controls.
- `People.tsx` counts for real — Ably presence for the room you are standing in,
  one REST roll-up for the rooms you are not (§4.1, presence rolls up).

**All of the above is committed and on `main`** — `design/app-matches-landing`
merged fast-forward at 08:59. Untracked and deliberate: `Sound/`,
`public/sound/`.

**Since, the same day — the seeds and the kit:**

- **The seeds.** `reference/seeds.json` (35 week-one rooms) and
  `scripts/seed-pins.mjs`. A seed is a real pin from Tari — `docs/PINS.md`,
  *The seeds*, has the four refusals that keep it from being an invented
  player. `Pin.cls` widened to `PinClass = ClassId | "tari"` and every author
  colour now goes through `authorColor()` in `lib/class-color.ts`.
- **The kit** (`app/(app)/kit/`, `lib/kit.ts`, `reference/kit.json`). The
  packing list, dealt as the deck's third use. `Kit` in the rail head beside
  ⌘K. Its last card is a door: `/r/<start>?say=1` opens the room holding its
  own deck with the composer already open — `say` threads page → Room → Decks
  → Left.
- **`TARI.md` §2.3, the second monitor.** Being outside the game is the
  mechanism, not a limitation: an addon lives in the corner of your eye and
  you follow it without stopping, so the distance is what buys the look away.
  The rule it produces: **nothing Tari puts back into the game may move you.**
  §9.2 now points at it.

**Then a dungeon and a raid — all four room kinds proved:**

- **`reference/guide/shadowfang-keep.json`** (17 cards) and
  **`reference/guide/zul-gurub.json`** (19 cards), researched from
  warcraft.wiki.gg and rewritten (§6.3). Both cite their sources in the file.
  **Vanilla 1.12 only** — SFK's Gilneas/Godfrey framing and ZG's Cataclysm
  rework are both retcons and neither appears.
- **The telling no longer needs a map.** `Room.tsx` gated the guide deck on a
  plate, and `plateFor` returns nothing for the thirty-three rooms that have
  none — every dungeon and every raid, which §4.1 calls the guide's own
  showcase. `Story` now takes `plate?`; it only ever read it to find where a
  rare stands, and `door()` already drew nothing without a spot. Neither
  instance file carries a `road` or an `at` on any card.
- **A card can stand with no object.** The rail draws a dot rather than an
  empty frame for a card with no `icon`, which is what lets a room be written
  before its art exists — the order the remaining seventy-five will need.
  `public/story/README.md` lists what the two new rooms still want.

**Then the cities and the rest of the seeds:**

- **Five city guide files** — `stormwind-city` (13), `ironforge` (11),
  `orgrimmar` (12), `thunder-bluff` (10), `darnassus` (12). Researched from
  warcraft.wiki.gg, sources cited in each file, **vanilla 1.12 only** (no
  Cataclysm harbour or Park destruction, no Council of Three Hammers, no
  Garrosh rebuild, no Baine, no burning tree). **Nine of seventy-nine rooms
  are now written, and all nine wear card art** — `public/story/<room>/`,
  converted out of the wardrobe build, `public/story/README.md` has the
  provenance and what is still a stand-in.
- **All seventy-nine rooms have a seed.** `reference/seeds.json` went from 35
  to 79 — every zone, dungeon, raid, city and place. Re-run
  `node scripts/seed-pins.mjs` to plant the 44 new ones; it is idempotent, so
  the 35 already standing are left alone.
- **The two new city files carry renames** (`now`): New Stormwind → Stormwind,
  Kalidar → Teldrassil. The other three were never renamed and draw plainly.

**Then the six starting zones:**

- `elwynn-forest` (13), `dun-morogh` (13), `teldrassil` (13), `durotar` (11),
  `mulgore` (11), `tirisfal-glades` (12) — all researched, all sourced in the
  file, all with card art. **Fifteen of seventy-nine rooms are written.**
- **Renames:** the Kalidar → Teldrassil card moved to the zone, where it
  belongs; Darnassus's title is Nordrassil now and draws plainly.
- **The nav no longer moves.** `.slot` in `story.module.css` holds a height
  taller than the tallest card, so the turns row underneath is fixed —
  measured, not guessed: across 111 cards the median renders at six lines and
  the p90 at seven, so the slot is sized for nine. The two cards that exceeded
  it (Corrupted Blood at fifteen, the Atal'ai at eleven) were breaking §6's own
  "a few short lines" and were cut rather than designed around. The pin card in
  `left.module.css` got the same treatment, since its pager sits under it too.

**`docs/TELLING.md` is the handoff.** The method for writing a room — the
research brief that works, the file shape, the non-negotiable rules, the icon
pipeline, the known vanilla traps, and all sixty-four remaining rooms grouped
into three waves. A fresh session should read it and `docs/TARI.md` §6 and be
able to carry on without asking anything.

**Outstanding from this pass:**

- **The Neon alter**, above. Nothing else in the schema moved.
- **The seeds are built and not yet planted** (`docs/PINS.md` — the seeds).
  A seed is a real pin from Tari: `reference/seeds.json` holds thirty-five
  rooms and `scripts/seed-pins.mjs` writes them. **Run it from your own
  terminal** — the bridge has no egress to Neon. `lib/guide.ts`'s `Card.seed`
  was not the answer and is still unused; it hangs off a card, and the rooms
  that open empty have no cards.
- **`rares` exists only in Duskwood.** Correct for a city; per-room content
  everywhere else.
- **The kit's cards wear the client's own objects** — eight icons lifted out
  of the wardrobe build into `public/kit/` (tracked, 36 KB, the way
  `public/pins/map-x.png` is; `public/kit/README.md` is the table). The last
  card wears the pin's treasure map. **The two argument cards wear nothing**,
  because they are not objects and the game has none that mean them.

---

## 0.3 Earlier — the dressing room, 2026-08-26 (late night)

**Gear can be put on by hand.** `docs/DRESSING.md` — the shape and the five
rulings; press a slot on `/you` and a drawer opens beside it with everything
that class and level can wear there, strongest first.

- `lib/proficiency.ts` — who wears what and swings what in 1.12, written by
  hand. Two level steps (plate at 40, mail at 40) and dual wield (warrior 20,
  rogue 10, hunter 20 — nobody else, which `gearIndices` cannot express since
  it sends every one-hander to both hands).
- `app/api/wardrobe/route.ts` — the second door onto `reference/items.json`,
  beside `/api/items`. One slot, one class, one level, optional name; answers
  with ids and the count it did not send. Cached a day, no new env, no schema.
  **Rows with no required level are read at item level minus five** — 1,870 of
  10,532 carry none, 856 of those are 40-plus gear, and without it Naxxramas
  sat at the top of a level 24's drawer.
- `lib/plan.ts` — the overlay. The `equip` mark finally has its store: subject
  is the gear index, `val` is the item id, un-equipping is the same tombstone
  the other five use. **The import is never written on.** `planKey` is the
  load-bearing bit — `useMarks` returns a new store on every commit anywhere,
  and a plan memo keyed on it rebuilt every mesh on the figure per star.
- `app/(app)/you/Drawer.tsx`, `Sheet.tsx`, `sheet.module.css` — the surface.
- Read everywhere and admitted everywhere: `lib/path.ts`'s letter gains a
  third line ("Two slots are yours, not the game's."), each planned slot wears
  an ink ring, and `ItemStage.tsx` says "Against what you plan to wear" when
  that is what it is pricing against. `Kit.tsx` reads the plan too.
- Two consequences worth knowing: **the card's press is the drawer's now** and
  the upgrade arrow got a 1.6rem target of its own (DROPS.md step 6 said the
  whole card was the arrow's press; it cannot be); and **a two-hander is in
  both hands** — the sheet hangs nothing off the second one, dims it, and the
  drawer for it says so.

`tsc --noEmit` clean, `next build` compiles/typechecks/prerenders all 93 pages,
and **clicked through on Kacey's dev server** (Nelfy, level 24 night elf druid,
2026-08-26 late night — put back as found afterwards, console clean):

- Chest drawer at 24: every row item level 29, cloth and leather only, no mail
  or plate. `total: 252`, 200 sent, "56 more. Search by name."
- Picked Brawnhide Armor → the figure redressed, the slot took the icon, the
  green name and the ring, its arrow went, and the letter went from "Nothing
  worn yet. / Nine of your slots fill in Shadowfang Keep." to "15 of your
  slots are empty. / Eight of them fill in Shadowfang Keep. / **One slot is
  yours, not the game's.**"
- Main hand: daggers, maces and staves. No swords, no axes — correct for a
  druid. Off hand: orbs and tomes only, no weapons and no shield — correct,
  a druid neither dual wields nor holds a shield.
- Magician Staff in the main hand → the off-hand drawer says "Both hands are
  on Magician Staff." and offers nothing; the off-hand arrow goes with it.
- Shadowfang Keep's kit read the plan ("WEARING Magician Staff", "WEARING
  Brawnhide Armor") and priced its drops against it; the stage's line read
  **"AGAINST WHAT YOU PLAN TO WEAR"**.
- Take off on both → back to "Nothing worn yet. / Nine of your slots fill in
  Shadowfang Keep.", third line gone, arrows back. The import was never
  touched.

**Second pass the same night, on Kacey's four notes, all clicked through:**

- **The summons came off the card.** The arrow opened a list of zone names; it
  opens the *gear* now, grouped under the room holding each, and it is a green
  pill outside the card carrying the count. `BehindSlot.answers` in lib/path.ts
  is the new half; DESIGN.md records the one exception to "Controls — settled".
- **Every row grew a wish star, an equip glyph, a door and a plate.**
  `app/(app)/you/Row.tsx` is the one row both panels use;
  `components/WishStar.tsx` is the kit's star, lifted so there is one;
  `lib/plate-item.ts` joins a dictionary row to what `ItemTooltip` reads, and
  `ItemHover` gained `quiet` — the game's half of the plate only, since the
  sheet holds the dictionary and not the world. A row's name is a door to
  `/r/<room>?item=<id>`, which is a new (tiny) deep link on the room.
- **Nothing moves.** The letter is always drawn and always reserved at three
  lines; a header that changed height was re-centring both gear columns.
- **Two traps.** A `max-age=86400` on a route still being written kept serving
  cloaks and necks at item level 60 to a level 24 long after the arithmetic was
  fixed — the route says 60s now and the drawer asks `no-cache`, the posture
  `loadCatalogue` already takes. And a grid column left at `auto` sizes to
  max-content, which pushed the star and the glyph off the panel's edge rather
  than ellipsising the name; `minmax(0, 1fr)` is the fix.

**Third pass, same night:** the summons became **a fixed square** on every
slot (a pill that breathed with its number read as a bar chart) and lost its
two-tone base; **the third slot is back** — `SHEET_SLOTS` is what the sheet
draws and the new `WORN_SLOTS` is what the figure wears, differing by exactly
the ranged id, and `thirdSlot()` names it Relic for a paladin, shaman or druid.
Which surfaced that the wardrobe catalogue has no art for idols, librams or
totems at all, so `lib/plate-item.ts` gained `RowItem` and a row is now named
from the catalogue where it has art and the dictionary where it has not. And
the drawer draws sixty rows rather than two hundred: two `ItemHover`s a row is
four hundred components laid out on one press, and the page locked up.

**Still untried:** a re-import over a plan (the interesting one — it should
leave every choice standing), a level 40 body watching plate arrive, and a
warrior at 19 then 20 watching dual wield open. **Uncommitted.**

---

## 0.4 Earlier — pins, the atom, 2026-08-26 (night)

**The atom is built** (docs/PINS.md — the shape; docs/TARI.md §2.2 — the
argument). A pin: one person, standing in one spot, saying one thing, and
it stays. Signed-in characters write; everyone reads; replies are one
level deep; all pins render with near-level ones louder (three rulings,
Kacey, 2026-08-26). The face is the hero's Seduced widget carried into
the room; the marker is the aggro `!`, drawn, in the pin pink.

- `db/schema.sql` — `pins` table, additive, tombstoned (`removed_at`),
  cascades off `users`. **Run it against Neon before this deploys.**
- `lib/pins.ts` / `lib/pins-db.ts` — the shape and the table read.
- `app/api/pins/route.ts` — GET public (stamps `mine`), POST 401 for
  strangers + rate-limited, DELETE tombstones your own. A landed pin is
  also published on `tari:<room>::pins` — the table is the history, the
  wire is the moment. No new env: the token capability (`tari:*`) and the
  occupancy roll-up (filters to `::$chat`) both already hold.
- `components/PinChip.tsx` — the face. `components/ZoneMap.tsx` — the
  layer, the thread rail, the composer ("Leave a pin" in the layer bar;
  press the plate to set the spot). Its authored POI layer renamed
  `poi`/`Poi` so "pin" means only the atom.
- `app/(app)/Live.tsx` — exposes the realtime handle; the map watches
  pins land on the one socket. ZoneMap is keyed by room in Dock now —
  it was keeping state across room changes.

Clicked through live 2026-08-26 (night, Kacey's dev server): leave,
hover, thread, reply, the landing echo. Three fixes from that pass: POI
and hunt-mark clicks now clear an open thread (the rail looked stuck —
"the map went non-interactive"); the rail at rest shows the room's pins
as a feed (`Feed` in ZoneMap) instead of the empty explainer (Kacey's
call); the `!` mark sits on a small dark-glass plate — the bare glyph
was invisible on light parchment. Then (same night, Kacey's ruling) the
pin's icon became **the game's treasure map** (`INV_Misc_Map_01` →
`public/pins/map-x.png`), worn everywhere the pin appears — mark, chip,
"Leave a pin" — familiarity of the game's own objects over drawn
vocabulary; PINS.md and DESIGN.md record the §7.1 amendment. Also:
`_to_delete/` is excluded in tsconfig now, and `/lab/map` passes the new
required `roomId`. Still wants a second account to see
`mine` stay private, and a second browser for the live landing.

---

## 0.5 Earlier that day — the live layer, 2026-08-26

**The room is live.** Ably, not Liveblocks: §8.1 of `docs/TARI.md` carries
the price that decided it (Liveblocks caps a room at 10 simultaneous
connections on every plan worth buying). `ABLY_API_KEY` is the one new
environment variable — it must be set in Vercel before this deploys, and
the key needs **`channel-metadata`** among its capabilities or the
next-door head counts silently return `{}`. Add it to `docs/CUTOVER.md`'s
checklist.

Built and clicked through in two live connections on Duskwood:

- `lib/ably.ts` — the wire names, the `Who` on presence, `CURSOR_CAP`.
- `app/api/ably/route.ts` — mints scoped tokens. Signed in, the clientId is
  the account handle and the browser gets no say; signed out it is the
  browser's own key, prefixed `g:`. The raw key never leaves the server.
- `app/api/ably/occupancy/route.ts` — the §4.1 roll-up, two steps: enumerate
  live channels, then ask each for its occupancy. **The `by=value` form of
  Ably's enumeration is not served on this plan** — it silently returns bare
  channel names, which is a `{}` and a lost afternoon. Cached 12s.
- `app/(app)/Live.tsx` — one connection for the life of the shell; the
  room's scope swapped by name inside it. Presence is entered here, not in
  the chat: you are in Duskwood the moment you arrive.
- `app/(app)/People.tsx` — names the room, **deduplicated by clientId** (a
  reader with two tabs is one person), plus counts beside next door.
- `r/[room]/Chat.tsx`, `Cursors.tsx`, `Moments.tsx` — bottom-left,
  everywhere, bottom-centre. `docs/DESIGN.md` "The live layer — settled".

**Two traps, both hit and both fixed, both worth remembering.** Ably refuses
past 50 messages a second on one channel, and the Spaces React hooks return
`.bind()`ed functions that are new on every render — an effect keyed on one
becomes a render→enter→message→render loop that blows that limit from a
single browser. And chat history overlaps the live listener, so lines are
merged and ordered by `serial` rather than appended.

**Not done:** typing indicators are built but were untestable from one
signed-in account (a reader's own typing is filtered out) — check them with
two real people. Pins are next.

---

## 1. What Tari is, in four lines

**Tari** (`tari.gg`) — formerly *whelp plz*. A companion for WoW Classic where
every zone, dungeon, raid and city is a **room** you can stand in with everyone
else who is there right now, cross-realm and cross-region.

- **The goal:** slow the player down.
- **The mechanism:** community. Slowing down is an outcome, not a feature — the
  only durable source of reasons to linger somewhere is other people.
- **The atom:** the pin. One person, one spot, one sentence, left for whoever
  arrives next at that level.

**The name:** Taretha Foxton — the human girl at Durnholde who secretly taught
Thrall to read and helped him escape, and died for it. Thrall called her Tari.
Canon lore *and* a common surname, so it is ownable. The mark is a fox.

---

## 2. The window — why this exists now

**The day fresh Classic+ realms open, every tool in the category is dead.**
No Wowhead data. RestedXP's waypoints are lies — their product *is* the path.
No Sixtyupgrades items, no Questie coordinates, no Icy Veins guides. For the
first time since 2004 nobody knows where anything is, and the only source of
knowledge is players discovering things in real time and telling each other.

> A window where the entire playerbase is **forced** to slow down. Not
> persuaded to. Forced to. Because there is no fast way through a world nobody
> has mapped.

It happens once and lasts weeks. **Ship before the fresh realms open.**

Two content halves, no gap: the **old world** comes from the CPLUS pipeline
plus Kacey's own in-game photography; **everything new** comes from the crowd,
live. No content build required for Classic+ — only the surface.

BlizzCon is 12–13 September 2026. Classic+ is rumour, heavily leaked. Fresh
realms follow an announcement by anywhere from four weeks (Season of Discovery)
to six months (Cataclysm Classic), so the date cannot be planned — but a fresh
realm is a *levelling season*, not a launch day.

---

## 3. Three repos

| repo | local path | state |
| --- | --- | --- |
| **`Daw99y/tari`** | `~/Documents/FLYFE/Tari` | **NEW. The active project.** |
| **`undiscovered`** | `~/Documents/FLYFE/undiscovered` | **OLD (whelp plz). STAYS LIVE. Do not touch.** |
| **`CPLUS`** | separate | The data pipeline. **Unchanged, not renamed, still in use** |

**Why whelp plz stays live:** Kacey's brother uses it and gives feedback — and
critically, **it keeps the event log writing** while Tari is built. When Tari
goes live it points at the same database and inherits every event generated in
the meantime.

**Do not maintain whelp plz.** If it breaks, it breaks.

### Hosting and data

| | whelp plz | Tari |
| --- | --- | --- |
| domain | whelpplz.com | tari.gg (to buy) |
| Vercel | existing project, untouched | **`tari`** — exists, deploys `main` from GitHub, `tari-chi.vercel.app` |
| Neon | `main` — keeps running, keeps writing events | `tari-dev` branch (copy-on-write) |
| Discord OAuth | existing app | **new** application, own client id/secret |

Discord user ids are stable across applications, so accounts still match on
`provider_id`. **Additive schema changes only; do not rename tables** — at
cutover Tari points at `main` and inherits everything.

---

## 4. What happened on 2026-08-23

The rebrand was decided and the repo split executed.

History was deliberately **not** imported: the old repo stays alive so nothing
is lost, and its history carries heavy `.mov`/`.glb` blobs that would bloat the
new clone forever.

**Genesis commit — 20 files, 2,317 lines:**

```
.gitignore  package.json  tsconfig.json  next.config.mjs  postcss.config.mjs
db/schema.sql
lib/  auth.ts  db.ts  sync.ts  import.ts  types.ts  utils.ts
      class-color.ts  faction.ts  feedback.ts  zip.ts
app/api/  auth/[...nextauth]  record  account  feedback
```

`lib/import.ts` is the **WP2 addon-export parser** — the most valuable file in
the repo.

**Deliberately left behind:**

- **`app/globals.css` — 385 KB.** Not a stylesheet, an archaeological site, and
  the clearest evidence of why `design.md` feels broken. Start empty.
- **The domain layer** — `plan.ts` (56 KB), `zones.ts` (50 KB), `journey.ts`
  (40 KB), `training.ts`, `item.ts`, `zone-prose.ts`. ~250 KB encoding the *old
  product's shape*. It is the moat and it returns later; bringing it in on day
  one re-anchors the rebuild to the app being replaced.
- Every page and component. All rebuilt.

**`npm run dev` failed at the time** — no `app/page.tsx`, `layout.tsx` or
`globals.css`, which was correct: the landing page was to be built on an empty
canvas. All three exist now, along with the hero, `/lab` and `/lab/doll`.

**Escape hatch** if something is needed from the old project later:

```bash
git remote add old git@github.com:Daw99y/undiscovered.git
git fetch old
git checkout old/main -- path/to/file   # one file, no history entanglement
```

---

## 5. The doll, and where the deploy got to

`/lab/doll` builds any of the sixteen playable bodies and puts any of **9,723**
items on them. `docs/DOLL.md` holds the whole of it; this is only the state.

**Three commits sit on `main`, local and unpushed as of 2026-08-25:**

```
a683831  feat(doll): serve the wardrobe from a Blob store so it survives a deploy
5c00583  fix(doll): read the patched item table, not the one the client shipped with
0deaf4e  Merge feat/doll-wardrobe  (this one IS pushed)
```

**The bodies are stripped, as of 2026-08-25.** A character `.m2` carries 126
to 143 animations and the page plays two, Stand and Stun. `npm run doll:strip`
writes `public/lab/doll/body/*.tbody` — 46.7 MB down to 3.4 MB, and 2.0 MB
down to 127 KB gzipped on the human female the landing page draws.
`doll-strip-check.mjs` poses every bone of every body against the original and
the difference is zero. `docs/DOLL.md` §"The animations nothing plays" has it.
The unstripped `.m2` is now gitignored; run `git rm -r --cached
public/lab/doll/m2` once to untrack the 47 MB already committed.

**Three build steps, none in git.** `node scripts/doll-build.mjs` writes the
bodies, `npm run doll:strip` cuts them down, `node scripts/doll-items.mjs`
writes the wardrobe. Both need the 1.12
client at `~/Downloads/WoW Classic`. The wardrobe is 12,460 files and 103 MB
under `public/lab/doll/items/`, which `.gitignore` covers.

**It cannot go in *this* repo.** Vercel fails a build above 15,000 source files
and the repo plus the art comes to 16,712. That is a wall, not a preference.
So the art is served from elsewhere and `NEXT_PUBLIC_WARDROBE_URL` points at
it; unset, the page falls back to the local build.

Two scripts fill that variable. `scripts/doll-publish.mjs` pushes the art to a
second repo for GitHub Pages, which is free and is the route taken on
2026-08-25. `scripts/doll-upload.mjs` puts it in a Vercel Blob store, which
needs a paid plan and is written but still untested. The page cannot tell the
difference, so switching later is one variable and a redeploy.

**The wardrobe is live.** `https://daw99y.github.io/tari-wardrobe` serves
12,459 files and 106 MB, against the 1 GB Pages allows. Checked on 2026-08-25
against real files rather than the root: `.webp` comes back as `image/webp`,
`.m2` as `application/octet-stream`, and all of it with
`access-control-allow-origin: *`. Nothing is set on Vercel yet, so the deployed
page has not seen any of it.

### What is blocking it

1. ~~**No Vercel project for Tari exists.**~~ **Created 2026-08-25.** Project
   `tari` (`prj_ouY6au8NM83RdJaJMeeI5Loa371z`), linked to `Daw99y/tari`,
   production deploys on every push to `main`. Five deploys so far, all READY.
   `/lab/doll` renders in production **with the wardrobe** —
   `NEXT_PUBLIC_WARDROBE_URL` is set and the deployed doll dresses.
2. ~~**The account is on Hobby**, so Blob is not usable.~~ **Settled 2026-08-25
   by not using Blob.** The wardrobe goes to GitHub Pages instead, which is
   free, needs no card, and costs one more repo rather than one more account.
   Blob would have been 12,460 advanced operations against an unpublished
   Hobby ceiling, and exceeding it **pauses the store for 30 days** rather than
   billing. Vercel's fair-use terms also restrict Hobby to non-commercial use,
   which Tari is not (§6 pricing tiers). Both problems belong to a store Tari
   no longer needs. Cloudflare R2 stays the upgrade if Pages disappoints:
   unmetered egress and a year of cache instead of ten minutes.
3. ~~**CORS is unverified.**~~ **Checked 2026-08-25.** GitHub Pages answers
   with `access-control-allow-origin: *`, which is the header the composed body
   texture needs: every overlay is drawn into that canvas, and cross-origin art
   without it taints the canvas, WebGL refuses the upload, and the armour
   vanishes with no error worth reading. Pages also sends `cache-control:
   max-age=600`, so art older than ten minutes costs a revalidating round trip
   per file rather than a download. Both headers were read off a live Pages
   response, not off the documentation. Still unproven **on Tari's own art**
   until the first deploy.

### How the neighbours do it

Checked on 2026-08-25: sixtyupgrades.com serves its own art from an S3 bucket
behind `cdn.sixtyupgrades.com` (`REACT_APP_S3_ASSETS_URL`, us-west-2, Cognito).
Not Wowhead's CDN. Object storage plus a CDN, art out of the app repo, is the
normal shape in this niche — the plan above is that shape.

---

## 6. Open and blocking

**Plumbing is now Tari's own** (own Discord app, `tari-dev` Neon branch,
Vercel env) — `docs/CUTOVER.md`. Domain purchase and the production
database switch are postponed on purpose until there is something to launch.

1. ~~**SPA or App Router**~~ **Decided 2026-08-25: App Router, no SPA.**
   The shell is a layout, the room is a page; layouts persist across
   navigation, which is the behaviour §11.1 wanted. `docs/SHELL.md` has the
   structure file by file. Room build is unblocked on this axis.
2. ~~**The contrast system.**~~ **Decided 2026-08-25, from measurement.**
   All 77 backgrounds rendered as the CSS renders them: the title is ≥10:1
   everywhere with the existing scrim; the open canvas is not, so text above
   the scrim goes on a card or chip at `rgba(6,6,10,.86)` + blur. Dark ink on
   the art never passes. `docs/CONTRAST.md`; rerun `scripts/contrast.py`.
3. **The fox mark**, and the redrawn SVG icon vocabulary (`TARI.md` §7).
4. Pricing tiers, moderation policy, landing hero copy.
5. **Buy `tari.gg`** ($129.99/yr via Vercel, checked 2026-08-25 — `.com`/`.io`/
   `.app` all taken) and `taretha.com` ($11.25) as a lore redirect. Both
   available.
6. ~~**Tag `v1-whelpplz`** on the old repo.~~ Done — the tag exists.
7. **§7.1 and the doll.** A character viewer puts far more of Blizzard's art on
   screen than a spell plate does. Deploying it publicly is the deliberate
   decision `TARI.md` §7.1 asks for, and it has not been taken — only deferred
   by the fact that nothing is deployed. Hobby offers Vercel Authentication as
   the only protection; password protection is a Pro add-on.

---

## 7. Environment notes

- **Cowork folder grants are per-session.** A folder connected in one chat is
  not connected in another. As of 2026-08-23 the granted set includes
  `~/Documents/FLYFE/Tari`, `~/Documents/FLYFE/undiscovered`, and the `FLYFE`
  parent — but confirm per session rather than assuming.
- **`~/Documents/FLYFE` must never be a git repo.** A stray `git init` landed
  there once and was removed. If a `.git` appears in the parent, delete it.
- Cloud sessions = cross-repo context, specs, mockups, review.
  Local Claude Code = implementation + verify. ONE local session per repo.
- **Do not run git writes over the Cowork bridge** — it cannot unlink, so
  commits leave lock files behind. Read `.git/HEAD` and `.git/refs/` directly.
- Verification from the cloud: tar the source, stage into the container,
  `npm install` there, run tsc / `next dev` / Playwright. `next build` cannot
  finish — `next/font` fetches Inter and the network does not reach it.
- A real Postgres runs in the cloud container (port 5433). A signed-in session
  can be faked with `next-auth/jwt` `encode` and the dev `AUTH_SECRET`.

---

## 8. Other docs

Still in the Claude project, not yet in the repo — worth pulling across if they
become load-bearing:

| doc | what it is |
| --- | --- |
| `PACE.md` | why it exists. Amended 2026-08-22 with the window |
| `PHASE-MAP-1.md` | the plate contract, coordinates, Layer A/B. Still live |
| `SECOND-SCREEN.md` | the wake, "the game is the chat" — arguments, not conclusions |
| `COMMUNITY-turn.md` | the accounts turn — arguments, not conclusions |
| `RANKING.md` | in the old repo. What the ranking believes. Untouched |

---

## 9. Note for whoever picks this up

Kacey went through a long, circular design process and got genuinely low
partway. The direction is now settled and written down — **do not reopen it.**
Hold the thesis steady, push back honestly when something drifts from it, and
keep the next action small and concrete.

Watch for the pattern of switching projects when a hard question lands (OSRS,
addon-only, and a full rebrand all surfaced in one evening). Naming it kindly
once is helpful; nagging is not.
