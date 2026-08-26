#!/usr/bin/env python3
"""Where the things that drop your gear actually stand.

The second mark layer, and the dense one. `scripts/map-pins.py` writes the
curated layer — quest givers, turn-ins, the handful of rares, the objective
clouds — which is what the open map draws. This writes the layer underneath
it: every creature a room's items name as a drop source, with the spot it
stands on, so a loot row can point at a place instead of only at a name.

    python3 scripts/map-spots.py duskwood   # one room
    python3 scripts/map-spots.py            # every room with a plate

Writes lib/spots/<room-id>.json. Reads .pf-cache/units.lua, which
scripts/map-pins.py downloads; this script never fetches anything and never
touches the ClassicDB dump — the room files already carry every creature's
name, so the only thing missing was the coordinate.

WHY pfQUEST AND NOT THE SPAWN TABLE. map-pins.py's header settles it: pfQuest
records in 1.12 map percent, which is the space the plates are registered
against, while mangos and ClassicDB record world coordinates whose conversion
needs map bounds this pipeline avoids trusting. That argument does not change
because the creature is a drop source rather than a quest giver. Measured
2026-08-26: every one of Duskwood's 27 drop sources and Westfall's 30 is in
the pfQuest table, in its own zone.

A room whose items are all quest rewards emits an empty file rather than no
file — Eastern Plaguelands is the case, and its items point at giver pins the
curated layer already carries. Absent means "no plate"; empty means "nothing
drops here". Those are different answers and the reader is allowed both.
"""

import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from zones import ZONES  # noqa: E402

OUT = os.path.join(ROOT, "lib", "spots")
ROOMS = os.path.join(ROOT, "reference", "rooms")

# A patrol walks; a pack scatters. Past this the points stop being places and
# start being a wash, exactly as map-pins.py's clouds do — and the row that
# reads this file wants a spot, not a survey.
MAX_POINTS = 24

# The grid the largest cluster is found on, in map percent. Six is about a
# minimap's width on a zone plate: two spawns in the same six percent are the
# same camp, and two in different cells are two camps.
CELL = 6.0


def units_coords():
    """Borrowed whole from map-pins.py rather than copied: one parser for one
    file, and the day pfQuest changes its shape only one thing has to move."""
    spec = importlib.util.spec_from_file_location("map_pins", os.path.join(HERE, "map-pins.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.units_coords()


def sources_of(room):
    """Creature id -> the name the room file gives it, for drop sources that
    stand in the world. An instance source cannot be on an outdoor plate, and
    a quest source is the curated layer's business."""
    path = os.path.join(ROOMS, f"{room}.json")
    if not os.path.exists(path):
        return None
    with open(path) as fh:
        data = json.load(fh)
    out = {}
    for item in data["items"]:
        for s in item["sources"]:
            if s["type"] != "drop" or s.get("instance"):
                continue
            out.setdefault(s["sourceId"], s["sourceName"])
    return out


def thin(points):
    """North to south, then evenly sampled. map-pins.py's rule, so the two
    layers scatter a creature's spawns in the same order."""
    points = sorted(points, key=lambda p: (-p[1], p[0]))
    if len(points) <= MAX_POINTS:
        return points
    step = len(points) / MAX_POINTS
    return [points[int(i * step)] for i in range(MAX_POINTS)]


def spot(points):
    """The one point that stands for the rest.

    Not the mean of them. map-pins.py refuses the mean because a patrol's two
    ends average to a place the creature never stands, sometimes out in a
    lake, and it takes the first recorded spawn instead. That is right about
    the mean and arbitrary about the answer: the first row is wherever the
    client's table happened to start.

    So: bucket the spawns onto a coarse grid, take the fullest bucket — the
    camp, rather than the stray that wandered — and inside it return the
    recorded point nearest that bucket's centre. Always a place the creature
    actually stands, always the busiest one, and the same answer every run.
    """
    buckets = {}
    for x, y in points:
        buckets.setdefault((int(x // CELL), int(y // CELL)), []).append((x, y))
    # Deterministic: fullest first, then north, then west. A file in git may
    # not change because a dict iterated differently.
    key = sorted(buckets, key=lambda k: (-len(buckets[k]), k[1], k[0]))[0]
    pack = buckets[key]
    mx = sum(p[0] for p in pack) / len(pack)
    my = sum(p[1] for p in pack) / len(pack)
    return min(pack, key=lambda p: ((p[0] - mx) ** 2 + (p[1] - my) ** 2, p[0], p[1]))


def build(room, zone, units):
    named = sources_of(room)
    if named is None:
        return None

    spots, missing = {}, []
    for cid in sorted(named):
        points = [(x, y) for x, y, z in units.get(cid, []) if z == zone]
        if not points:
            missing.append((cid, named[cid]))
            continue
        x, y = spot(points)
        spots[str(cid)] = {
            "x": round(x, 1),
            "y": round(y, 1),
            "n": len(points),
            "p": [[round(px, 1), round(py, 1)] for px, py in thin(points)],
        }

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{room}.json")
    with open(path, "w") as fh:
        json.dump({"room": room, "zoneId": zone, "spots": spots}, fh)
    return len(named), len(spots), missing, os.path.getsize(path)


if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only and only not in ZONES:
        sys.exit(f"{only} has no plate — it is not in scripts/zones.py")
    rooms = [only] if only else list(ZONES)

    print("reading .pf-cache/units.lua")
    units = units_coords()

    total_src = total_hit = 0
    for room in rooms:
        result = build(room, ZONES[room][1], units)
        if result is None:
            print(f"{room}: no room file, skipped")
            continue
        n, hit, missing, size = result
        total_src, total_hit = total_src + n, total_hit + hit
        pct = f"{100 * hit // n}%" if n else "—"
        print(f"lib/spots/{room}.json: {hit}/{n} sources placed ({pct}), {size:,}b")
        for cid, name in missing:
            print(f"  off the plate: {name} ({cid})")

    if len(rooms) > 1 and total_src:
        print(f"\n{total_hit}/{total_src} drop sources placed ({100 * total_hit // total_src}%)")
