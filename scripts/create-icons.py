"""The creator's icons: the 1.12 client's own character-create art.

The game draws its creation screen out of four atlases in
`Interface\\Glues\\CharacterCreate`. Three of them are all we want — the race
portraits, the class icons and the two sex marks — and each is a grid of 64px
cells with the dark rounded border already painted in, which is why they sit
on Tari's panel without a frame of our own around them.

The fourth, `UI-CharacterCreate-Factions`, is the pair of crests. It is 128x64
and holds one cell per side.

Run it from the repo root, with a 1.12 client at the path `scripts/client.mjs`
names:

    python3 scripts/create-icons.py

29 files land in `public/create/`, about 2 KB each, and they are tracked: the
wardrobe's exclusion in `.gitignore` is about 12,459 files and 106 MB, and
this is neither.

The cell order in the atlases is Blizzard's, not ours. It is written out below
rather than derived, because there is nothing in the file to derive it from —
the sheet is a picture, and the order is only knowable by looking at it.
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from blp import decode  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CLIENT = Path("/Users/daw99y/Downloads/WoW Classic")
DATA = CLIENT / "app/Data"
EXTRACTOR = CLIENT / "MPQExtractor/build/bin/MPQExtractor"
ARCHIVES = ["interface.MPQ", "patch.MPQ", "patch-2.MPQ"]  # a patch's copy wins

TMP = ROOT / ".create-tmp"
OUT = ROOT / "public/create"
GLUE = "Interface/Glues/CharacterCreate"

# The race atlas: 4x4 of 64px cells, the eight races across the top two rows as
# males and the same eight across the bottom two as females.
RACE_CELLS = ["human", "dwarf", "gnome", "night-elf", "tauren", "undead", "troll", "orc"]

# The class atlas: nine cells, left to right, wrapping at four.
CLASS_CELLS = [
    "warrior", "mage", "rogue", "druid",
    "hunter", "shaman", "priest", "warlock",
    "paladin",
]


def cell(img, index, columns=4, size=64):
    row, col = divmod(index, columns)
    return img.crop((col * size, row * size, (col + 1) * size, (row + 1) * size))


def main():
    if not EXTRACTOR.exists():
        sys.exit(f"no extractor at {EXTRACTOR}; see scripts/client.mjs")

    TMP.mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for archive in ARCHIVES:
        subprocess.run(
            [str(EXTRACTOR), "-e", "Interface\\Glues\\CharacterCreate\\*", "-f", "-o", str(TMP), str(DATA / archive)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    def sheet(name):
        path = TMP / GLUE / f"{name}.blp"
        if not path.exists():
            sys.exit(f"{name}.blp did not come out of any archive in {DATA}")
        return decode(str(path))

    def write(img, name):
        img.save(OUT / f"{name}.webp", "WEBP", lossless=True, method=6)

    races = sheet("UI-CharacterCreate-Races")
    for i, slug in enumerate(RACE_CELLS):
        write(cell(races, i), f"race-{slug}-male")
        write(cell(races, i + 8), f"race-{slug}-female")

    classes = sheet("UI-CharacterCreate-Classes")
    for i, slug in enumerate(CLASS_CELLS):
        write(cell(classes, i), f"class-{slug}")

    sexes = sheet("UI-CharacterCreate-Gender")
    for i, slug in enumerate(["male", "female"]):
        write(cell(sexes, i, columns=2), f"sex-{slug}")

    crests = sheet("UI-CharacterCreate-Factions")
    for i, slug in enumerate(["alliance", "horde"]):
        write(cell(crests, i, columns=2), f"crest-{slug}")

    shutil.rmtree(TMP)
    total = sum(p.stat().st_size for p in OUT.glob("*.webp"))
    print(f"{len(list(OUT.glob('*.webp')))} icons in public/create/, {total // 1024} KB")


if __name__ == "__main__":
    main()
