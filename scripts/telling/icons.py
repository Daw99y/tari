#!/usr/bin/env python3
"""Convert wardrobe icons into public/story/<room>/<card>.png. Reads a JSON map on stdin."""
import json, os, sys
from PIL import Image
SRC = "public/lab/doll/items/icons"
M = json.load(sys.stdin)
missing = [(r, c, b) for r, cs in M.items() for c, b in cs.items()
           if not os.path.exists(f"{SRC}/icons_{b}.webp")]
if missing:
    print("MISSING SOURCES:", missing); sys.exit(1)
for room, cards in M.items():
    d = f"public/story/{room}"; os.makedirs(d, exist_ok=True)
    for cid, blp in cards.items():
        im = Image.open(f"{SRC}/icons_{blp}.webp").convert("RGBA")
        if im.size != (64, 64): im = im.resize((64, 64), Image.LANCZOS)
        im.save(f"{d}/{cid}.png", optimize=True)
    print(f"{room}: {len(cards)} icons")
