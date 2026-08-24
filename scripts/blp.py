"""BLP2 to PNG.

Pillow opens these files but throws the alpha away on the palettised ones: it
reads the palette indices and stops, so every item overlay in the client comes
out fully transparent. Those overlays are exactly the files that need alpha,
because a sleeve texture only covers part of its rectangle and the skin has to
show through the rest.

So the palettised case is decoded here. The layout is a 256-entry BGRA palette,
then one index byte per pixel, then a separate alpha plane whose width depends
on alphaDepth. Anything else — DXT, raw ARGB — goes back to Pillow, which
handles those correctly.

Usage: a JSON list of [src, dst] pairs on stdin; a JSON list of
[src, reason] failures on stdout.
"""

import json
import struct
import sys

from PIL import Image

HEADER = struct.Struct("<4sIBBBBII")
PALETTE_OFFSET = 4 + 4 + 4 + 4 + 4 + 64 + 64  # magic, type, flags, w, h, mip tables


def decode(path):
    with open(path, "rb") as fh:
        b = fh.read()

    magic, _type, encoding, alpha_depth, _alpha_encoding, _mips, w, h = HEADER.unpack_from(b, 0)
    if magic != b"BLP2" or encoding != 1:
        return Image.open(path).convert("RGBA")

    mip_offsets = struct.unpack_from("<16I", b, 20)
    palette = struct.unpack_from("<1024B", b, PALETTE_OFFSET)
    base = mip_offsets[0]
    count = w * h

    out = bytearray(count * 4)
    for i in range(count):
        p = b[base + i] * 4
        out[i * 4] = palette[p + 2]  # the palette is BGRA
        out[i * 4 + 1] = palette[p + 1]
        out[i * 4 + 2] = palette[p]
        out[i * 4 + 3] = 255

    alpha = base + count
    if alpha_depth == 8:
        for i in range(count):
            out[i * 4 + 3] = b[alpha + i]
    elif alpha_depth == 4:
        for i in range(count):
            byte = b[alpha + (i >> 1)]
            nibble = (byte & 0x0F) if i % 2 == 0 else (byte >> 4)
            out[i * 4 + 3] = nibble * 17
    elif alpha_depth == 1:
        for i in range(count):
            bit = (b[alpha + (i >> 3)] >> (i & 7)) & 1
            out[i * 4 + 3] = 255 if bit else 0
    # alpha_depth 0 leaves the image opaque, which is already the case.

    return Image.frombytes("RGBA", (w, h), bytes(out))


def main():
    bad = []
    for src, dst in json.load(sys.stdin):
        try:
            # Lossless WebP: identical pixels, about 40% of the PNG size across
            # this art, and roughly four thousand files ship.
            img = decode(src)
            if dst.endswith(".webp"):
                img.save(dst, "WEBP", lossless=True, method=4)
            else:
                img.save(dst)
        except Exception as exc:  # noqa: BLE001 - the caller only needs the reason
            bad.append([src, str(exc)])
    json.dump(bad, sys.stdout)


if __name__ == "__main__":
    main()
