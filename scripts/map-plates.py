#!/usr/bin/env python3
"""A zone's map art, cut to the three widths the plate serves.

`ZoneMap` hands the browser a srcset and lets it choose, so a phone never
pulls the 4K sheet (`components/ZoneMap.tsx`). The source is a single PNG in
art-sources/maps; nothing downstream ever reads it, which is why it can stay
out of public/ at eleven megabytes apiece.

    python3 scripts/map-plates.py duskwood "art-sources/maps/Duskwood MAP.png"

Writes public/maps/<room-id>-<width>.webp. Quality 80 at method 6 is what the
Eastern Plaguelands plates shipped at; keep it, so a re-encode of one zone
does not quietly change the weight of the others.
"""

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "maps")
WIDTHS = (2048, 3072, 4096)
QUALITY, METHOD = 80, 6


def main(room, src):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    os.makedirs(OUT, exist_ok=True)
    for width in WIDTHS:
        path = os.path.join(OUT, f"{room}-{width}.webp")
        im.resize((width, round(width * h / w)), Image.LANCZOS).save(
            path, quality=QUALITY, method=METHOD
        )
        print(f"{path}  {os.path.getsize(path) / 1024:.0f} KB")
    print(f"aspect [{w}, {h}] — put this in the plate's `aspect` in lib/maps.ts")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
