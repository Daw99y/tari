#!/usr/bin/env python3
"""The pins on a plate, and the objective clouds under them.

A plate is art plus a coordinate space (`lib/maps.ts`); this writes what
stands on it. Two sources, each answering only what it is authoritative for:

  pfQuest (shagu/pfQuest, MIT)   where a thing is, in 1.12 map percent, and
                                 which quest starts or ends on it
  ClassicDB 1.12.1               what the thing is called, its level, and
                                 whether the client ranks it rare

pfQuest carries no rank and ClassicDB carries no map percent, so neither one
alone can draw the map. Coordinates never come from ClassicDB: its spawn
positions are world coordinates, and converting them needs the map bounds
this pipeline is trying to avoid trusting.

    python3 scripts/map-pins.py duskwood   # one room
    python3 scripts/map-pins.py            # every room in scripts/zones.py

The room's area id and display name are looked up rather than typed: the
crossing between Tari's id, the client's name and pfQuest's area id lives in
scripts/zones.py.

Writes lib/maps/<room-id>.json. The lua tables are cached under .pf-cache/;
delete the folder to pull fresh ones.
"""

import gzip
import json
import math
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from zones import ZONES, room_names  # noqa: E402
CACHE = os.path.join(ROOT, ".pf-cache")
OUT = os.path.join(ROOT, "lib", "maps")
DUMP = "/Users/daw99y/Documents/FLYFE/CPLUS/classic-db/Full_DB/ClassicDB_1_12_1_z2815.sql.gz"

PF = "https://raw.githubusercontent.com/shagu/pfQuest/master/db/"
FILES = {"units.lua": "units.lua", "quests.lua": "quests.lua", "quests-enUS.lua": "enUS/quests.lua"}

# `creature_template` column order in the 1.12.1 dump, for the four columns
# this needs. Pinned by index because the dump has no header row.
NAME, MIN_LEVEL, MAX_LEVEL, RANK = 1, 3, 4, 33
# MaNGOS ranks. 2 is rare elite, 4 is rare; 1 and 3 are elite and boss, which
# are ordinary residents of a zone and not worth a pin of their own.
RARE_RANKS = {2, 4}

# An objective cloud past this many spawns is a wash of colour, not a place,
# so it is thinned to this many evenly through the sorted list.
MAX_POINTS = 60

# The rail prints a pin's quests in full. Past this many the list stops being
# something you read and starts being a wall — the Argent Dawn quartermasters
# alone hand out twenty-four writs. The rest are counted, never guessed at.
MAX_QUESTS = 6


def cached(name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        print(f"fetching {FILES[name]}")
        urllib.request.urlretrieve(PF + FILES[name], path)
    return path


# ---------------------------------------------------------------- pfQuest

def units_coords():
    """unit id -> [(x, y, zone), ...], in 1.12 map percent."""
    out, cur = {}, None
    head = re.compile(r"^\s{2}\[(\d+)\] = \{")
    coord = re.compile(r"\{\s*([\d.]+),\s*([\d.]+),\s*(\d+),")
    for line in open(cached("units.lua"), encoding="utf8"):
        m = head.match(line)
        if m:
            cur = out.setdefault(int(m.group(1)), [])
            continue
        m = coord.search(line)
        if m and cur is not None:
            cur.append((float(m.group(1)), float(m.group(2)), int(m.group(3))))
    return out


def quests():
    """quest id -> {lvl, min, start/end/obj: {"U": [unit ids], ...}}."""
    out, cur, section = {}, None, None
    head = re.compile(r"^\s{2}\[(\d+)\] = \{")
    key = re.compile(r'^\s{4}\["(\w+)"\] = (.*)$')
    sub = re.compile(r'^\s{6}\["(\w)"\] = \{ ([\d, ]+) \}')
    for line in open(cached("quests.lua"), encoding="utf8"):
        m = head.match(line)
        if m:
            cur, section = out.setdefault(int(m.group(1)), {}), None
            continue
        if cur is None:
            continue
        m = key.match(line)
        if m:
            k, v = m.group(1), m.group(2).strip()
            if v == "{":
                section = cur.setdefault(k, {})
            else:
                section, v = None, v.rstrip(",")
                if v.isdigit():
                    cur[k] = int(v)
            continue
        m = sub.match(line)
        if m and section is not None:
            section[m.group(1)] = [int(n) for n in m.group(2).split(",") if n.strip()]
    return out


def quest_titles():
    out, cur = {}, None
    head = re.compile(r"^\s{2}\[(\d+)\] = \{")
    title = re.compile(r'^\s{4}\["T"\] = "(.*)",$')
    for line in open(cached("quests-enUS.lua"), encoding="utf8"):
        m = head.match(line)
        if m:
            cur = int(m.group(1))
            continue
        m = title.match(line)
        if m and cur is not None:
            out[cur] = m.group(1).replace("\\'", "'").replace('\\"', '"')
    return out


# --------------------------------------------------------------- ClassicDB

def creatures():
    """creature id -> (name, min level, max level, rank)."""
    out = {}
    if not os.path.exists(DUMP):
        sys.exit(f"the ClassicDB dump is not at {DUMP}")
    with gzip.open(DUMP, "rt", encoding="utf8", errors="replace") as fh:
        for line in fh:
            if line.startswith("INSERT INTO `creature_template`"):
                for r in rows(line):
                    try:
                        out[int(r[0])] = (r[NAME], int(r[MIN_LEVEL]), int(r[MAX_LEVEL]), int(r[RANK]))
                    except (ValueError, IndexError):
                        pass
    return out


def rows(line):
    """Each (...) tuple of a MySQL INSERT, as a list of strings. Written out
    rather than split on commas because names carry both commas and quotes."""
    i, n = line.index("VALUES") + 6, len(line)
    while i < n:
        while i < n and line[i] != "(":
            i += 1
        if i >= n:
            return
        i += 1
        row, buf, quoted = [], [], False
        while i < n:
            c = line[i]
            if quoted:
                if c == "\\":
                    buf.append(line[i + 1])
                    i += 2
                elif c == "'":
                    quoted, i = False, i + 1
                else:
                    buf.append(c)
                    i += 1
            elif c == "'":
                quoted, i = True, i + 1
            elif c == ",":
                row.append("".join(buf))
                buf, i = [], i + 1
            elif c == ")":
                row.append("".join(buf))
                i += 1
                break
            else:
                buf.append(c)
                i += 1
        yield row


# ------------------------------------------------------------------ build

def here(coords, zone):
    return [(x, y) for x, y, z in coords if z == zone]


def thin(points):
    """Sorted north to south, then evenly sampled down to MAX_POINTS."""
    points = sorted(points, key=lambda p: (-p[1], p[0]))
    if len(points) <= MAX_POINTS:
        return points
    step = len(points) / MAX_POINTS
    return [points[int(i * step)] for i in range(MAX_POINTS)]


def build(room, zone, name, sources):
    units, qs, titles, cs = sources

    starts, ends = {}, {}
    for qid, q in qs.items():
        for uid in q.get("start", {}).get("U", []):
            starts.setdefault(uid, []).append(qid)
        for uid in q.get("end", {}).get("U", []):
            ends.setdefault(uid, []).append(qid)

    pins, missing, starts_here = [], [], set()
    for uid in sorted(u for u, coords in units.items() if here(coords, zone)):
        gives, takes = starts.get(uid, []), ends.get(uid, [])
        row = cs.get(uid)
        rare = bool(row) and row[3] in RARE_RANKS
        if not gives and not takes and not rare:
            continue
        if not row:
            missing.append(uid)
            continue
        # A giver that also takes turn-ins is still a giver: what you go to it
        # for the first time is the quest.
        kind = "giver" if gives else "turnin" if takes else "rare"
        starts_here.update(sorted(gives))
        # The first recorded spawn, not the mean of them: a patrol's two ends
        # average to a point it never stands on, sometimes out in a lake.
        x, y = here(units[uid], zone)[0]
        pins.append({
            "id": uid,
            "name": row[0],
            "kind": kind,
            "kinds": [kind],
            "lvl": [row[1], row[2]],
            "x": x,
            "y": y,
            "quests": [{"id": q, "title": titles.get(q, f"Quest {q}"), "lvl": qs[q].get("lvl", 0)}
                       for q in sorted(gives)[:MAX_QUESTS]],
            "turnins": [titles.get(q, f"Quest {q}") for q in sorted(takes)[:MAX_QUESTS]],
        })

    # Objective clouds: where the quests handed out here send you. Only for
    # quests a pin in this zone starts, and only where the objective stands
    # in this zone too — a cloud off the plate cannot be drawn.
    areas = []
    for qid in sorted(starts_here):
        for oid in qs[qid].get("obj", {}).get("U", []):
            row = cs.get(oid)
            # `<TXT>…` rows are the client's invisible quest doodads.
            if not row or row[0].startswith("<"):
                continue
            spots = here(units.get(oid, []), zone)
            if not spots:
                continue
            areas.append({
                "quest": qid,
                "title": titles.get(qid, f"Quest {qid}"),
                "creature": oid,
                "name": row[0],
                "points": [[x, y] for x, y in thin(spots)],
            })

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{room}.json")
    with open(path, "w") as fh:
        json.dump({"zone": name, "zoneId": zone, "pins": pins, "areas": areas}, fh)

    kinds = {k: sum(1 for p in pins if p["kind"] == k) for k in ("giver", "turnin", "rare")}
    print(f"{path}: {len(pins)} pins {kinds}, {len(areas)} objective clouds")
    if missing:
        print(f"  no ClassicDB row, dropped: {sorted(missing)}")


if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only and only not in ZONES:
        sys.exit(f"{only} is not in scripts/zones.py")
    rooms = [only] if only else list(ZONES)
    names = room_names()
    # The four tables are the slow part and none of them depend on the zone,
    # so they are read once and handed to every room.
    sources = (units_coords(), quests(), quest_titles(), creatures())
    for r in rooms:
        build(r, ZONES[r][1], names.get(r, r.replace("-", " ").title()), sources)
