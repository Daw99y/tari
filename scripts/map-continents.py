#!/usr/bin/env python3
"""The three maps above a zone: the world, and a continent each.

`map-plates-client.py` cuts one zone's plate. This cuts the maps a zone sits
inside. Same twelve-tile 1002x668 sheet, no subzone overlays painted on.

**The client's names are not ours and not obvious.** `World` is the world
map with both continents on it; `Azeroth` is the Eastern Kingdoms continent
(vanilla named the continent after the planet); `Kalimdor` is Kalimdor.
There is no folder called EasternKingdom in a 1.12 client — that spelling
arrives with a later expansion, and guessing it costs an afternoon.

Reads the archives with mpyq rather than the MPQExtractor binary the other
scripts shell out to, so it runs anywhere Python does:

    pip3 install mpyq
    python3 scripts/map-continents.py

Writes public/maps/{world,eastern-kingdoms,kalimdor}-1002.webp, and a
lossless PNG of each into art-sources/maps/upscale/.

1002px is the client's own ceiling and it is soft on a big display, so these
three are worth a 4K upscale — three images, not forty-six. Upscale the PNGs,
never the webp: the webp is quality 80 and an upscaler will faithfully
enlarge its artefacts. The 4K result comes back through scripts/maps-4k.py.
"""

import os
import sys
import tempfile

from mpyq import MPQArchive
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from blp import decode  # noqa: E402

CLIENT = os.environ.get("WOW_CLIENT", os.path.expanduser("~/Downloads/WoW Classic"))
# NOT public/. The landing page's world section is a departures board, not a
# map, so nothing references these sheets — and everything under public/
# deploys. They are art sources until something asks for them.
OUT = os.path.join(ROOT, "art-sources", "maps", "client-sheets")
# Masters never ship (public/journey/README.md), so the upscaler's input
# sits with the other art sources rather than under public/.
UPSCALE = os.path.join(ROOT, "art-sources", "maps", "upscale")

TILE = 256
SHEET = (1024, 768)  # 4 tiles by 3, before the crop
PLATE = (1002, 668)  # what the client actually draws
QUALITY, METHOD = 80, 6

# our name -> the client's folder, which is also its tile prefix
SHEETS = {"world": "World", "eastern-kingdoms": "Azeroth", "kalimdor": "Kalimdor"}

# Patches override the base archive, so they are read first and the first
# archive holding a tile wins.
ARCHIVES = ["patch-2.MPQ", "patch.MPQ", "interface.MPQ"]


def data_dir():
    for base in (CLIENT, os.path.join(os.path.expanduser("~"), "mnt", "WoW Classic")):
        d = os.path.join(base, "app", "Data")
        if os.path.isdir(d):
            return d
    sys.exit(f"no app/Data under {CLIENT} — set WOW_CLIENT to the client folder")


def sheet(out_id, name, archives, tmp):
    img = Image.new("RGBA", SHEET)
    for i in range(12):
        raw = None
        for a in archives:
            try:
                raw = a.read_file(f"Interface\\WorldMap\\{name}\\{name}{i + 1}.blp")
            except Exception:
                raw = None
            if raw:
                break
        if not raw:
            print(f"  {out_id}: {name}{i + 1}.blp is in none of the archives")
            return None
        # blp.decode reads a path; the archive hands us bytes.
        path = os.path.join(tmp, f"{name}{i + 1}.blp")
        with open(path, "wb") as f:
            f.write(raw)
        img.paste(decode(path), ((i % 4) * TILE, (i // 4) * TILE))

    flat = img.crop((0, 0, *PLATE)).convert("RGB")

    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f"{out_id}-{PLATE[0]}.webp")
    flat.save(out, quality=QUALITY, method=METHOD)

    os.makedirs(UPSCALE, exist_ok=True)
    master = os.path.join(UPSCALE, f"{out_id}.png")
    flat.save(master)

    print(f"  {out_id}: from {name}, {os.path.getsize(out) / 1024:.0f} KB"
          f" (+ {os.path.getsize(master) / 1024:.0f} KB png to upscale)")
    return out


def main():
    data = data_dir()
    archives = []
    for a in ARCHIVES:
        p = os.path.join(data, a)
        if os.path.exists(p):
            archives.append(MPQArchive(p))
    if not archives:
        sys.exit(f"no MPQ archives in {data}")
    with tempfile.TemporaryDirectory() as tmp:
        made = [k for k, v in SHEETS.items() if sheet(k, v, archives, tmp)]
    print(f"{len(made)} of {len(SHEETS)} sheets written to public/maps")


if __name__ == "__main__":
    main()
