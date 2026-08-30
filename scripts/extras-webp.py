"""The full-bleed photographs, sized for the wire.

The captures come off the client at 5504x3072 and land in art-sources/extras/
as PNG, which is right for a source and ruinous for a page: the Hillsbrad
hero shipped as a 26 MB PNG and was, on its own, eighty times the weight of
the character standing in it.

Writes public/RLextras/<kebab-name>.webp. Quality 80 at method 6 is the same
setting map-plates.py uses, and 3200px is the cap: these are object-fit:cover
across the whole viewport rather than inside a card, so they render wider
than the 2560 a panel image needs.

    python3 scripts/extras-webp.py            everything that has no webp yet
    python3 scripts/extras-webp.py --force    rebuild them all

The PNGs stay in art-sources/ as the source of truth. Nothing in public/
should ever be one.
"""

import os
import re
import sys

from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), "..", "art-sources", "extras")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "RLextras")
WIDTH = 3200
QUALITY = 80


def kebab(name: str) -> str:
    """RatchetBank -> ratchet-bank. The published names are kebab; the sources
    keep the capture's own capitalisation."""
    s = re.sub(r"[\s_]+", "-", name.strip())
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "-", s)
    return re.sub(r"-+", "-", s).lower()


def main() -> None:
    force = "--force" in sys.argv
    os.makedirs(OUT, exist_ok=True)

    sources = sorted(f for f in os.listdir(SRC) if f.lower().endswith((".png", ".jpg", ".jpeg")))
    if not sources:
        print(f"No captures in {SRC}")
        return

    for f in sources:
        stem = os.path.splitext(f)[0]
        dst = os.path.join(OUT, f"{kebab(stem)}.webp")
        if os.path.exists(dst) and not force:
            print(f"  skip  {os.path.basename(dst)}  (exists; --force to rebuild)")
            continue

        src = os.path.join(SRC, f)
        # Flattened to RGB: these are opaque captures, and an alpha plane webp
        # carries for nothing costs a fifth of the file.
        im = Image.open(src).convert("RGB")
        w = min(WIDTH, im.width)
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(dst, "WEBP", quality=QUALITY, method=6)

        before = os.path.getsize(src)
        after = os.path.getsize(dst)
        print(
            f"  {os.path.basename(dst):<28} {im.width}x{im.height} -> {w}x{h}"
            f"   {before // 1024:>6} KB -> {after // 1024:>4} KB   ({before // after}x)"
        )


if __name__ == "__main__":
    main()
