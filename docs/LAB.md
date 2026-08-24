# Lab — pulling spell visuals out of the 1.12 client

`/lab` shows the real status-effect models. This is how they got there and
how to get more. Written 2026-08-23.

## What the files are

In 1.12 a spell visual is a chain of four tables plus a model:

```
Spell.dbc  →  SpellVisual.dbc  →  SpellVisualKit.dbc  →  SpellVisualEffectName.dbc  →  Spells\*.m2
```

`SpellVisualEffectName.dbc` has the model path. The `.m2` holds geometry,
colour tracks, texture names and particle emitters. Overhead marks like
Taunt are **mesh**, coloured by a track in the file; the texture is a flat
white 8×8. That is why the lab can draw them from the file alone.

All 142 DBCs are already extracted in the CPLUS repo:
`~/Documents/FLYFE/CPLUS/data/raw/dbc-all/`.

## Where the client is

```
/Users/daw99y/Downloads/WoW Classic/
  WoW-1.12.1-Setup.exe + -1/-2/-3.bin     Inno Setup installer, 5.4 GB
  app/Data/*.MPQ                          the archives, once extracted
  MPQExtractor/build/bin/MPQExtractor     StormLib CLI, already built
```

The installer ships `dbc`, `patch`, `patch-2` loose. The rest had to be
pulled out of the installer:

```bash
cd "/Users/daw99y/Downloads/WoW Classic"
innoextract -I app/Data/model.MPQ -I app/Data/texture.MPQ -I app/Data/interface.MPQ -d . WoW-1.12.1-Setup.exe
```

`innoextract --list WoW-1.12.1-Setup.exe` shows the others (`wmo`, `terrain`,
`sound`, `speech`, `misc`, `fonts`, `base`, `backup`).

## Listing and extracting

```bash
X="/Users/daw99y/Downloads/WoW Classic/MPQExtractor/build/bin/MPQExtractor"
cd "/Users/daw99y/Downloads/WoW Classic/app/Data"

"$X" -l /tmp/model.txt model.MPQ              # full listing, 7 838 files
grep -i 'spells\\taunt' /tmp/model.txt

"$X" -e 'Spells\Taunt_Head.m2' -o ./out model.MPQ
```

Patches override base: check `patch.MPQ` first for a newer copy of a file
(`Confused_State_Head.m2` only exists there).

Icons are 64×64 BLP in `interface.MPQ` under `Interface\Icons\`. Pillow
reads BLP directly: `Image.open("x.blp").save("x.png")`.

## Reading and drawing an .m2

`lib/m2.ts` reads the file; `app/lab/m2-render.ts` plays it on a 2D canvas.
Per frame it samples every bone's translation/rotation/scale track, builds
the hierarchy, honours billboard flags against the camera, skins the
vertices, sorts triangles far to near, and paints each one with its texture
(affine-mapped through the canvas transform), tinted by the colour track, at
the alpha the colour and transparency tracks give, in the blend mode the
render flags give. Particles are not drawn. Textures ship as PNG under
`public/lab/tex/` (Pillow reads BLP; `Flare.blp` would not decode and only
the particle-only files want it).

If a new file breaks the page, the first things to print are `version` (must
be ≤ 263), `nVerts` at `0x44`, and the view block at `0x4C`.

Vanilla quirks that cost time:

- Submesh struct starts `id, level, vstart, vcount, istart, icount` — there
  is a `level` field that later docs omit.
- Triangles index the view's index list, which indexes the vertex list.
- `M2Color` is two 28-byte tracks; colour is a float3 per key, alpha is an
  int16 / 0x7fff. Rotation keys are four floats (unit quaternion).
- Bones are 108 bytes. Flags: `0x8` spherical billboard (stars, Z's,
  hearts), `0x40` cylindrical around Z (Taunt's root — it always faces you,
  upright). A billboard keeps its pivot in the hierarchy and lays its
  offsets in camera space.
- State visuals ship three sequences: id `0` pops in, `158` loops, `159`
  fades out. Sequence flag bit 1 marks a one-shot. The lab plays `0` once
  then holds `158`; one-shots hold their last frame for two seconds.
- Render flag bit 1 is *unlit*; nearly every spell visual sets it. Blend 3
  and 4 are additive. Additive needs an opaque destination — on a
  transparent canvas `lighter` accumulates alpha and opaque-black texels
  leave dark squares. Paint the ground first.

## What is not in 1.12

The jagged white `!` on black in a yellow ring — the one over the Strat
skeletons — is not in any archive here, nor in the Ascension 3.3.5 client.
It belongs to the modern engine (Classic Era / retail), which stores assets
in CASC, not MPQ. To get it: install WoW Classic Era from Battle.net, open
it with `wow.export`, search `taunt` and `exclamation` under `spells/`, and
export the `.m2` plus its `.blp`. `lib/m2.ts` will need the post-264 header
layout to read it (skins are external `.skin` files from that version on).

## Provenance rule

These files are Blizzard's. They are on `/lab` to choose a vocabulary from
and nowhere else. Per `docs/TARI.md` §7.1 the shipped UI vocabulary is
redrawn, and anything on the paid tier is original art.
