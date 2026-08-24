# Doll — a character wearing gear, out of the 1.12 client

`/lab/doll` builds any playable vanilla character — eight races, both genders,
every skin, face, hair and beard — and dresses them, all read from the same
client `/lab` reads spell visuals from. The panel offers the five choices the game's own creation screen offers,
in the same order, and the figure stands in Goldshire rather than a void.
Written 2026-08-24.

## What runs where

```
scripts/doll-build.mjs   DBC → MPQ → public/lab/doll/{m2,tex,manifest.json}
scripts/blp.py           BLP2 → PNG, including the alpha Pillow drops
scripts/dbc.mjs          the WDBC table reader
lib/m2.ts                the M2 reader, now with normals, geosets, attachments
lib/m2-gl.ts             three.js drawing, CPU skinning
lib/doll.ts              the dressing rules: regions, sockets, geosets
app/lab/doll/            the page
```

Run `node scripts/doll-build.mjs` to rebuild the assets. It takes about 90
seconds; most of that is MPQ scans, which cost three seconds each, so the
script groups every file it wants by folder and pulls one folder at a time.

## Three mechanisms, not one

Nothing in an `.m2` says how an item attaches to a body. Three separate things
are going on, and each item uses one or two of them.

**Models.** A sword, shield, helm or pair of shoulders is its own `.m2`, hung
off a numbered socket on a bone. `ItemDisplayInfo` names the file. Sockets are
in the character file: 34 of them, ids 0 to 33. Id 1 is the right hand, 0 the
shield hand, 11 the helm, 5 and 6 the shoulders.

**Body texture.** A chest, legs, gloves or boots have no geometry. They are
paint, dropped into fixed rectangles of one 256×256 skin over the bare body.
`BODY_REGIONS` in `lib/doll.ts` is that layout. Overlay sizes narrow it down —
every one the client ships is 128 pixels wide, and the two 128-pixel columns
of the skin each total exactly 256 tall — but sizes alone are not enough to
place them. The region map below settled it.

**Geoset visibility.** The character file carries every glove, boot, sleeve and
robe skirt at once — 57 submeshes for a human male. An item switches its own
variant on. The rule is uniform: each family defaults to variant 1, and an
item's `geosetGroups` value plus one selects a different variant. A cloth glove
has value 0, so it keeps variant 1 and only repaints the hand.

## Column layouts, pinned against real rows

`ItemDisplayInfo.dbc`, 23 fields:

```
0     id
1-2   model, left and right
3-4   model texture, left and right
5     icon                          (one field, not two)
6-8   geoset group
9     flags
10    spell visual
11    sound
12-13 helmet geoset visibility, male and female
14-21 body textures: arm upper, arm lower, hand, torso upper, torso lower,
      leg upper, leg lower, foot
22    item visual
```

Two arrangements of those 23 fields both look plausible, and a robe settles
it: its geoset groups read 2/0/1 at columns 6 to 8, which selects sleeve
variant 3 and robe-skirt variant 2, a floor-length robe. Read one column
later and the same row gives a short skirt. Column 12 is non-zero on 852 of
1,582 helm rows and on 10 of the other 22,270, which pins the helmet field.

`CharSections.dbc`, 10 fields: `id, race, gender, base section, variation,
colour, texture ×3, flags`. Base section is 0 skin, 1 face, 2 facial hair,
3 hair, 4 underwear. Rows with `flags` set to 1 are NPC-only variants; skip
them or you get two skins for one colour.

`CharHairGeosets.dbc`, 6 fields: `id, race, gender, variation, geoset, show
scalp`. The style index is not the geoset. For a human male, style 1 is geoset
2, style 2 is geoset 3, and style 0 is bald with the scalp shown. Every style
and colour ships, and the page pairs the mesh with its paint from this table
rather than from a constant — pairing them by hand is how you draw one haircut
wearing another one's texture.

`CharacterFacialHairStyles.dbc`, 9 fields: `variation, gender, race`, three
fields holding leftovers (`0x77…`, `0xCCCCCCCC`), then the beard, moustache
and sideburn variants. Race is the third column, not the second.

`HelmetGeosetVisData.dbc`, 6 fields: `id`, then five race bitmasks for hair,
beard, moustache, sideburns and ears. Bit N set means a character of race N
loses that group while the helm is on.

## What cost time

- **The attachment struct is 48 bytes, not 40.** Docs disagree. Reading at 40
  gives ids like 1067925072 and NaN positions; reading at 48 gives ids 0 to 33
  in order, on bones whose height and side match their names.
- **Pillow throws away BLP alpha.** It opens a palettised BLP2, reads the
  palette indices and stops. The alpha plane sits right after the index plane
  and never gets read, so every item overlay converts to a fully transparent
  PNG and the armour silently does not appear. `scripts/blp.py` decodes the
  palettised case and hands DXT back to Pillow.
- **The body chunk has holes.** Geoset 0 spans the full height of the model,
  which reads like a complete body, but a height histogram of its vertices
  shows nothing between z 0.20 and 0.72. The bare lower leg is geoset 501 and
  the bare hand is 401. Leave those off and the character loses their shins.
- **Geoset families are `floor(id / 100)`.** Hair styles are ids 1 to 13, so
  they share family 0 with the body. Family 1 is the beard, not the hair.
- **Flattening filenames loses whole races.** Every race ships its own
  `Character\<Race>\Hair00_00.blp`. Drop the directory and eight different
  haircuts become one file, last one wins, and races quietly wear each other's
  hair. Extract with `-f` and name the output after the whole path. The tell
  was the texture folder growing from 22 MB to 27 MB once it was fixed.
- **A tauren's mane is not hair.** Its hair rows name a face texture and a
  scalp texture and no hair texture at all, because the mane is painted into
  the body rather than hung off a hair mesh. Anything that looks for a file
  called `Hair<n>` needs a fallback.
- **A bone with no keys in this animation must rest, not borrow.** This one
  wore three wrong diagnoses before the right one. A character's jaw, eyes and
  ears are keyed in the emote animations and not in Stand, and the sampler was
  clamping into the Stand window and handing back whichever key was nearest —
  a pose from some other animation entirely. The face tore itself apart: a hole
  through the cheek, loose polygons round the mouth, a second ear. Drawing the
  raw authored vertices with no bone transform at all settles it in one
  screenshot, and that test is worth reaching for early. Effect models want the
  opposite — their bones sit at the origin and only the animation moves them
  out, so resting one hides it — which is why `sampleTrack` takes a flag and
  only characters set it.
- **Hair is a cutout whatever the blend says.** The slots the game fills with
  hair art carry textures that are mostly transparent — a tauren's mane is 13%
  opaque — and a batch marked opaque renders every empty texel as a solid black
  slab.
- **A shaven style still has a beard texture.** Human male style 2 names no
  geosets at all, and its texture row is not the blank one — the blank is
  variation 8, which belongs to a style that does have geometry. Paint the
  texture anyway and a clean-shaven character grows a flat beard. The rule is
  to skip the paint when the style names no mesh.
- **`basename()` cannot split a game path.** These use backslashes. On macOS
  `node:path` leaves them alone and every extraction check fails.
- **The hair style index is not the hair geoset.** Draw the index and you get
  a different haircut than the texture was painted for — a tall style under a
  cap, poking through it. `CharHairGeosets` has the mapping.
- **Facial hair needs both a geoset and a texture, and the texture is a
  separate CharSections row.** Without it the beard geometry draws untextured
  and the mouth sprites in the corner of the face texture show through, which
  looks like a black bar stuck to the upper lip. Those sprites are real: the
  eyes and the mouth are 4-pixel patches in the bottom right of the face-lower
  overlay, and geoset 0 samples them directly.
- **One item model can have 57 display rows that disagree.**
  `Helm_Leather_A_01` has 33 rows that hide nothing and 24 that hide hair.
  Picking the first match by model name gets you an arbitrary one.
- **Model names in the DBC end `.mdx` or `.mdl`; on disk they are `.m2`.**
  Head models also carry a race and gender suffix, `Helm_Leather_A_01_HuM.m2`.
  Body texture names carry `_M`, `_F` or `_U`; try the gendered name, then
  unisex.

## Why WebGL

`/lab` paints spell visuals on a 2D canvas: a few hundred additive triangles,
sorted back to front, unlit. A dressed character is 1,350 opaque triangles that
have to occlude each other and catch a light. Painter sorting tears on a solid
mesh, and per-triangle affine texturing seams. `lib/m2-gl.ts` hands the parsed
M2 to three.js and lets a depth buffer sort it.

Skinning stays on the CPU and reuses `poseBones` and `skin` from
`m2-render.ts`, so the bone maths has one implementation. Three thousand
vertices costs well under a millisecond, and attachments can then read a
bone's world matrix straight off the pose, which is what hanging a sword in a
hand needs.

## Sixteen bodies

All eight races and both genders come out of one run, which is why the
archives are only scanned once per race — a scan costs about four seconds and
the extractor's pattern reaches a whole subtree, so `Character\Tauren\*`
covers both genders in one pass.

Nothing about a body is assumed. A tauren male has 19 skins and 5 faces; a
gnome has 5 and 7. A human female has 19 hairstyles, a troll female 5. Only
five of the sixteen bodies have facial hair at all, and three races do not call
it that: the row reads Horns for a tauren, Tusks for a troll, Features for the
undead, taken from `ChrRaces` columns 26 and 28, which hold the race's own word
or `NORMAL` when the plain label will do.

Camera framing comes from the model's own bounds. A tauren is half again a
gnome's height, and a fixed distance either crops one or strands the other.

Item art is gendered too. Body overlays carry `_M`, `_F` or `_U`, and head
models carry a race-and-gender suffix (`Helm_Leather_A_01_HuF.m2`). Two things
that look like bugs on the female body are the art doing what it was drawn to
do: the mail chest's lower overlay is 17% opaque against the male's 82%, so
the midriff really is bare, and the leather cap has sculpted hair at the sides
that reads as hair escaping the helm. Take the helm off and the real hair
appears; the hide rule was working.

Choices are held as indices into per-body option lists, so switching body only
has to clamp — hair 18 of 19 on a female becomes 12 of 12 on a male. Clamping
against an empty list would pin every choice to zero, so it only runs once the
lists have arrived.

## What the head tables do not agree on

Three tables have to line up for a head, and across sixteen bodies they often
do not. The page reads all three and offers only what can actually draw.

**The three texture columns are positional.** `CharSections` gives each row up
to three textures, and which is which depends on the section: a hair row is the
hair mesh's texture, then the lower and upper halves of the scalp. Drop the
empty ones to tidy the array and a scalp texture slides into the hair slot,
which is how a tauren ends up with armour painted on its mane.

**A tauren's mane is not hair.** Its rows name a face texture (male) or a file
the archives do not ship at all (female), and its model has no hair texture
slot: where every other race uses texture type 6, a tauren uses type 8. Feed
type 8 the composed body skin — the obvious reading of "skin extra" — and the
mane comes out wearing whatever chest the character has on.

**Some models name their own textures.** The night elves and the undead name an
eye glow, the gnome male a second skin. A model's texture table is the only
place these appear, so a build that only reads DBCs never fetches them and the
geoset that uses one draws untextured.

**Roughly a third of the facial-hair styles cannot draw.** Each style names
three variants, one each for geoset families 1, 2 and 3, and most races only
use one family — an orc's piercings are all family 1, a troll's tusks all
family 3 — so two of the three naming nothing is normal. But 37 of about 120
style rows name nothing that exists in their own model: human male beard styles
3 and 8 ask for geosets 103 and 203, and the file stops at variant 2. Those are
dropped from the picker. Whether they were cut options or bad rows, the DBC
still lists them.

## Choosing a head

Hair takes two tables that have to agree: `CharHairGeosets` names the mesh and
`CharSections` names the paint, indexed by the same style number but not by the
same values. The rail picks a style, a colour and a beard, and looks both up
together, so they cannot drift apart. Beards use the hair colour, which is why
there is one colour picker rather than two. The swatches are averaged from the
art at build time.

Style 0 is bald and sets `show scalp`, which composites two extra layers into
the face rectangles. Without them a bald head has no hairline.

## Two debug switches worth keeping

**A tauren's two head rows are swapped.** What `CharHairGeosets` offers a
tauren is 26 to 42 triangles sitting on top of the skull; what
`CharacterFacialHairStyles` offers is an 88-triangle piece hanging from the
shoulders to the crown. The first is a pair of horns, the second a mane, and
the geometry is what says so — `ChrRaces` column 28 agrees (HORNS) but the same
columns call a human's beard PIERCINGS, so the eight label pairs are written
out in `lib/doll.ts` rather than derived.

**A note on what is not solved.** For some races the picker offers fewer
options than the game does — an orc male model carries nine piercing meshes but
`CharacterFacialHairStyles` only gives eight style rows for that body, and
several of those point at meshes it does not have. Either the styles come from
somewhere else as well, or the table is partly dead weight. It has not been
run down.

Nor is the geometry around a human's mouth. Front-face culling punches a hole
through the face there; drawing the body two-sided closes it but exposes loose
interior polygons around the mouth and a second ear on the cheek, so it is not
a fix and has been reverted. The triangles are known — fourteen of geoset 0
sample the sprite corner of the face texture, four more sample the top-right of
the torso rectangle — but which of them the game draws, and how, is not.

**Show region map** paints the body with one flat colour per 128×32 slot of
the skin, sixteen in all. It is the only reliable way to check `BODY_REGIONS`
against the art, and it is how the face rectangles were confirmed: the face
lands on slots 6 and 7, the hairline strip on slot 5.

**Draw every chunk** submits all 57 submeshes at once, overlapping variants
included. Ugly on purpose. Use it to find out what a file contains before
guessing at a rule.

A tick in the chunk list beats the dressing rules, which is the point — it is
how you check that a helm's hide rule is doing anything. A forced chunk is
marked `forced` in red, the family heading names what the gear takes off
("head hides hair"), and one button drops every manual change. Without those
marks the panel reads as a bug report: tick a hair style under a helm that
hides hair and the hair comes through the cap, exactly as asked.

## Not done yet

- 81 MB on disk: 4,131 textures at 27 MB and 36 models at 54 MB. The models
  dominate and are mostly animation — a character file carries 142 sequences
  and the bench plays one. Stripping the rest would need a rewriter that fixes
  every absolute offset in the header, which is why it has not been done. The
  browser only ever fetches the one body it is showing, so this is repo weight,
  not page weight.
- One race and gender. `RACE` and `GENDER` at the top of the build script drive
  it; the other 17 character models are in `model.MPQ`.
- Held items sit on the right sockets but keep their own orientation. Sheathed
  and drawn positions use different sockets (26 to 28 for sheathed) and are not
  wired up.
- `SLOT_FAMILIES` maps a slot to the geoset families it controls. Chest and legs
  are guesses that render correctly for the mail set in the manifest. Check
  each against a robe and a set of plate before trusting them.
- Cloaks, tabards and belts have families and sockets here, but no item in the
  manifest exercises them.

## Provenance

Same rule as `docs/LAB.md`. These are Blizzard's files, on `/lab` to work
against. Per `docs/TARI.md` §7.1 the shipped UI vocabulary is redrawn, and
anything on the paid tier is original art. A character viewer puts far more of
their art on screen than a spell plate does, so shipping this to users is a
decision to take deliberately, not a side effect of the lab.
