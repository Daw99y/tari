#!/usr/bin/env python3
"""A zone's plate, built out of the 1.12 client instead of a sourced PNG.

`map-plates.py` cuts art Kacey found; this one cuts art the client already
has. Every vanilla zone map is a 1002x668 sheet stored as twelve 256px BLP
tiles, plus one overlay per subzone that the client paints on as you explore
it. Composited with every overlay down, you get the map of a zone somebody
has walked all of — which is the only version worth showing a reader.

The result is exactly the coordinate space pfQuest records in, so `reg` is
the identity and no landmark fitting is needed. It is also only 1002px wide,
so it goes soft when the reader pushes past about 2x. That is the trade:
every zone now, at the client's resolution, and a file drop into
art-sources/maps upgrades any one of them later — run `map-plates.py` on the
new art and widen the plate's `widths` in lib/maps.ts.

    python3 scripts/map-plates-client.py            # every room in ROOMS
    python3 scripts/map-plates-client.py westfall   # one

Writes public/maps/<room-id>-1002.webp.
"""

import os
import struct
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from blp import decode  # noqa: E402
from zones import ZONES  # noqa: E402

OUT = os.path.join(ROOT, "public", "maps")
TMP = os.path.join(ROOT, ".map-tmp")
DBC = os.path.join(ROOT, ".dbc-112")

# The same client scripts/client.mjs reads. Kept here rather than imported
# because this is the one Python script that needs it.
CLIENT = "/Users/daw99y/Downloads/WoW Classic"
DATA = os.path.join(CLIENT, "app/Data")
EXTRACTOR = os.path.join(CLIENT, "MPQExtractor/build/bin/MPQExtractor")
ARCHIVES = ["patch-2.MPQ", "patch.MPQ", "interface.MPQ"]

TILE = 256
SHEET = (1024, 768)  # 4 tiles by 3, before the crop
PLATE = (1002, 668)  # what the client actually draws
QUALITY, METHOD = 80, 6

# ------------------------------------------------------------------- client

def dbc(name):
    """One 1.12 table, lifted out of the patch chain and cached, the same way
    dbc112() in scripts/client.mjs does it."""
    path = os.path.join(DBC, "DBFilesClient", f"{name}.dbc")
    if not os.path.exists(path):
        extract([f"DBFilesClient\\{name}.dbc"], DBC, ["patch-2.MPQ", "patch.MPQ", "dbc.MPQ"])
    if not os.path.exists(path):
        sys.exit(f"{name}.dbc did not come out of any archive in {DATA}")
    return read_dbc(path)


def read_dbc(path):
    """A flat table: a 20-byte header, fixed-size records of 4-byte fields,
    then one string block. Text columns hold a byte offset into that block."""
    b = open(path, "rb").read()
    if b[:4] != b"WDBC":
        sys.exit(f"{path}: not a DBC")
    n_rec, n_field, rec_size, sb_size = struct.unpack_from("<4I", b, 4)
    sb_off = 20 + n_rec * rec_size
    rows = [struct.unpack_from(f"<{n_field}I", b, 20 + r * rec_size) for r in range(n_rec)]

    def string(off):
        if off <= 0 or off >= sb_size:
            return ""
        end = b.index(b"\0", sb_off + off)
        return b[sb_off + off:end].decode("utf8", "replace")

    return rows, string


def extract(patterns, dest, archives=ARCHIVES):
    """Patches override the base archives, so they are searched first, and a
    later archive is allowed to overwrite what an earlier one wrote. A
    pattern missing from an archive is normal."""
    for archive in reversed(archives):
        for pattern in patterns:
            subprocess.run(
                [EXTRACTOR, "-e", pattern, "-f", "-o", dest, os.path.join(DATA, archive)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )


# -------------------------------------------------------------------- build

def tables():
    """The client's name for each map, and the overlays painted on it.
    WorldMapArea: 0 id, 1 continent, 2 area, 3 name. WorldMapOverlay:
    1 the map it belongs to, 8 texture, 9-10 size, 11-12 offset."""
    rows, string = dbc("WorldMapArea")
    areas = {string(r[3]): (r[0], r[2]) for r in rows}

    rows, string = dbc("WorldMapOverlay")
    overlays = {}
    for r in rows:
        name = string(r[8])
        if name:
            overlays.setdefault(r[1], []).append((name, r[9], r[10], r[11], r[12]))
    return areas, overlays


def plate(room, client_name, areas, overlays):
    if client_name not in areas:
        print(f"  {room}: no WorldMapArea row named {client_name}")
        return None
    map_id, _area_id = areas[client_name]

    # One wildcard per archive rather than one call per file: a zone's folder
    # is thirty-odd tiles, and asking for them one at a time spends a minute
    # per zone in process startup instead of half a second.
    folder = os.path.join(TMP, "Interface", "WorldMap", client_name)
    extract([f"Interface\\WorldMap\\{client_name}\\*"], TMP)
    if not os.path.isdir(folder):
        print(f"  {room}: nothing under Interface\\WorldMap\\{client_name}")
        return None
    # The archive spells its files however it likes (AddlesStead1.blp) and
    # the DBC shouts them (ADDLESSTEAD1). MPQ lookup does not care; a case
    # sensitive filesystem does, so match on the lowered name.
    on_disk = {f.lower(): os.path.join(folder, f) for f in os.listdir(folder)}

    sheet = Image.new("RGBA", SHEET)
    for i in range(12):
        tile = on_disk.get(f"{client_name}{i + 1}.blp".lower())
        if not tile:
            print(f"  {room}: {client_name}{i + 1}.blp is not in the archives")
            return None
        sheet.paste(decode(tile), ((i % 4) * TILE, (i // 4) * TILE))

    painted = 0
    for name, w, h, ox, oy in overlays.get(map_id, []):
        cols, rows_ = -(-w // TILE), -(-h // TILE)
        n = 1
        for r in range(rows_):
            for c in range(cols):
                tile = on_disk.get(f"{name}{n}.blp".lower())
                n += 1
                if tile:
                    sheet.alpha_composite(decode(tile), (ox + c * TILE, oy + r * TILE))
        painted += 1

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{room}-{PLATE[0]}.webp")
    sheet.crop((0, 0, *PLATE)).convert("RGB").save(path, quality=QUALITY, method=METHOD)
    print(f"  {room}: {painted} subzones painted, {os.path.getsize(path) / 1024:.0f} KB")
    return path


def main(only):
    if not os.path.exists(EXTRACTOR):
        sys.exit(f"no MPQExtractor at {EXTRACTOR}")
    areas, overlays = tables()
    if only and only not in ZONES:
        sys.exit(f"{only} is not in scripts/zones.py — add the client's name for it first")
    rooms = [only] if only else list(ZONES)
    made = [r for r in rooms if plate(r, ZONES[r][0], areas, overlays)]
    print(f"{len(made)} of {len(rooms)} plates written to public/maps")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
