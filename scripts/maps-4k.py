#!/usr/bin/env python3
"""Pull an upscaled map back into public/maps.

The three continent sheets come out of the client at 1002x668, which is the
client's ceiling and soft on a big display. They go through a 4K upscale
(Higgsfield / bytedance) and come back as PNGs on a CDN — and neither the
Cowork bridge nor its Linux VM has egress to that CDN, so the download is a
step only Kacey's own terminal can take.

    python3 scripts/maps-4k.py world=https://…png eastern-kingdoms=https://…png

Writes public/maps/<id>-4096.webp beside the 1002 original. Nothing is
overwritten: the small sheet stays, the way duskwood keeps its 2048 next to
its 4096.
"""

import os
import sys
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "maps")
QUALITY, METHOD = 82, 6


def main(pairs):
    if not pairs:
        sys.exit(__doc__.strip().split("\n\n")[-2])
    for pair in pairs:
        if "=" not in pair:
            sys.exit(f"expected id=url, got {pair}")
        room, url = pair.split("=", 1)
        tmp = os.path.join("/tmp", f"{room}-4k.png")
        urllib.request.urlretrieve(url, tmp)
        im = Image.open(tmp).convert("RGB")
        path = os.path.join(OUT, f"{room}-{im.width}.webp")
        im.save(path, quality=QUALITY, method=METHOD)
        print(f"  {room}: {im.width}x{im.height}, {os.path.getsize(path) / 1024:.0f} KB → {os.path.basename(path)}")
        os.remove(tmp)


if __name__ == "__main__":
    main(sys.argv[1:])
