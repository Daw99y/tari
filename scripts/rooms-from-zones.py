#!/usr/bin/env python3
"""The reshape. docs/CARRYOVER.md, "the one structural change".

whelp plz's pipeline emits one file per zone per class (441). Tari's room is
class-agnostic and the reader is the class, so this folds the nine class
files of a zone into one room file, deduped by item, each item carrying the
classes it came from. Instance items are routed to the dungeon or raid room
their source stands in, so a dungeon room has a file too.

    python3 scripts/rooms-from-zones.py [path/to/undiscovered/reference/zones]

Writes reference/rooms/<room-id>.json and regenerates lib/loot-files.ts.
Rerun whenever the pipeline emits. Nothing in the app reads the zone files
directly.
"""

import glob
import json
import os
import re
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "undiscovered", "reference", "zones")
OUT = os.path.join(ROOT, "reference", "rooms")
FILES_TS = os.path.join(ROOT, "lib", "loot-files.ts")
BANDS_TS = os.path.join(ROOT, "lib", "room-bands.ts")
DROPS_TS = os.path.join(ROOT, "lib", "room-drops.ts")

BUCKETS = {"mobSpecificDrops": "drop", "zoneExclusive": "exclusive", "dungeonItems": "instance"}
# The emission's name for a place, where it differs from the room's.
RENAME = {"Ahn'Qiraj": "Ahn'Qiraj"}

# Buildings the emission files under one name that Tari draws as wings.
# Keyed by creature name; the emission only names bosses and named mobs in
# these two, so the table is exact. A creature not listed is a hole: it is
# printed, never guessed.
WINGS = {
    "Dire Maul": {
        "dire-maul-east": ["Alzzin the Wildshaper", "Hydrospawn", "Lethtendris", "Zevrim Thornhoof", "Phase Lasher", "Pusillin"],
        "dire-maul-west": ["Tendris Warpwood", "Illyanna Ravenoak", "Magister Kalendris", "Immol'thar", "Prince Tortheldrin",
                           "Lord Hel'nurath", "Tsu'zee", "Revanchion", "Ironbark Protector", "Petrified Guardian", "Petrified Treant"],
        "dire-maul-north": ["Guard Mol'dar", "Stomper Kreeg", "Guard Fengus", "Guard Slip'kik", "Captain Kromcrush",
                            "Cho'Rush the Observer", "King Gordok", "Gordok Mastiff", "Knot Thimblejack"],
    },
    "Blackrock Spire": {
        "lower-blackrock-spire": ["Highlord Omokk", "Shadow Hunter Vosh'gajin", "War Master Voone", "Mother Smolderweb",
                                  "Urok Doomhowl", "Quartermaster Zigris", "Halycon", "Gizrul the Slavener", "Overlord Wyrmthalak",
                                  "Bannok Grimaxe", "Crystal Fang", "Ghok Bashguud", "Spirestone Battle Lord", "Spirestone Butcher",
                                  "Spirestone Lord Magus", "Burning Felguard"],
        "upper-blackrock-spire": ["Pyroguard Emberseer", "Solakar Flamewreath", "Jed Runewatcher", "Goraluk Anvilcrack",
                                  "Warchief Rend Blackhand", "Gyth", "The Beast", "General Drakkisath", "Lord Valthalak"],
    },
}
WING_OF = {(inst, mob): rid for inst, wings in WINGS.items() for rid, mobs in wings.items() for mob in mobs}


def slug(name):
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", name.lower()))


def room_names():
    """id -> name, straight out of lib/rooms.ts, so a room is named once."""
    src = open(os.path.join(ROOT, "lib", "rooms.ts")).read()
    return dict(re.findall(r'id: "([a-z0-9-]+)", name: "([^"]+)"', src))


def main():
    names = room_names()
    ids = set(names)
    rooms = {}  # room id -> {name, band, items: {itemId: item}, worldDrops}
    missing = defaultdict(int)

    def room(rid, name, band=None):
        r = rooms.get(rid)
        if not r:
            r = rooms[rid] = {"room": rid, "name": names.get(rid, name), "band": band, "items": {}, "worldDrops": None}
        return r

    def add(r, item, cls, bucket):
        got = r["items"].get(item["itemId"])
        if got:
            if cls not in got["classes"]:
                got["classes"].append(cls)
            return
        copy = dict(item)
        copy["classes"] = [cls]
        copy["bucket"] = bucket
        r["items"][item["itemId"]] = copy

    for path in sorted(glob.glob(os.path.join(SRC, "*-*.json"))):
        data = json.load(open(path))
        meta = data["zone"]
        cls = data["class"]
        zid = slug(meta["name"])
        if zid not in ids:
            missing[zid] += 1
            continue
        z = room(zid, meta["name"], meta["levelRange"])
        z["worldDrops"] = data["worldDrops"]

        for key, bucket in BUCKETS.items():
            for item in data[key]:
                if bucket != "instance":
                    add(z, item, cls, bucket)
                    continue
                # An instance item lives in the instance's room, not the zone's;
                # in a building drawn as wings, in the wing its creature stands in.
                places = {}
                for src in item["sources"]:
                    inst = src.get("instanceName")
                    if not src.get("instance") or not inst:
                        continue
                    if inst in WINGS:
                        wing = WING_OF.get((inst, src["sourceName"]))
                        if not wing:
                            missing[f"{inst} / {src['sourceName']}"] += 1
                            continue
                        places[wing] = inst
                    else:
                        places[slug(RENAME.get(inst, inst))] = inst
                for pid, name in places.items():
                    if pid not in ids:
                        missing[pid] += 1
                        continue
                    add(room(pid, name), item, cls, "instance")

    # A dungeon's band is the spread of the creatures in it.
    for r in rooms.values():
        if r["band"] is None:
            lv = [s["sourceLevel"] for i in r["items"].values() for s in i["sources"] if s.get("sourceLevel")]
            if lv:
                r["band"] = {"min": min(x["min"] for x in lv), "max": max(x["max"] for x in lv)}

    os.makedirs(OUT, exist_ok=True)
    stale = {os.path.basename(f)[:-5] for f in glob.glob(os.path.join(OUT, "*.json"))} - set(rooms)
    for rid, r in sorted(rooms.items()):
        items = sorted(r["items"].values(), key=lambda i: (i["availableAtLevel"], i["name"]))
        for i in items:
            i["classes"].sort()
        out = {"room": rid, "name": r["name"], "band": r["band"], "items": items, "worldDrops": r["worldDrops"]}
        with open(os.path.join(OUT, f"{rid}.json"), "w") as f:
            json.dump(out, f, separators=(",", ":"))

    with open(FILES_TS, "w") as f:
        f.write("// GENERATED by scripts/rooms-from-zones.py — do not edit.\n")
        f.write("// One static import per room file so the loot folds into the build.\n\n")
        f.write('import type { LootFile } from "./loot";\n\n')
        names = []
        for rid in sorted(rooms):
            ident = "r_" + rid.replace("-", "_")
            names.append((rid, ident))
            f.write(f'import {ident} from "../reference/rooms/{rid}.json";\n')
        f.write("\nexport const LOOT_FILES: Record<string, LootFile> = {\n")
        for rid, ident in names:
            f.write(f'  "{rid}": {ident} as LootFile,\n')
        f.write("};\n")

    # The bands again, on their own, because the rail needs them and the rail
    # is a client component: importing loot-files.ts to read one field per room
    # would ship 75 files of item data to every visitor to order a sidebar.
    # Same source, same generator, one number each.
    with open(BANDS_TS, "w") as f:
        f.write("// GENERATED by scripts/rooms-from-zones.py — do not edit.\n")
        f.write("//\n")
        f.write("// The level band per room, split out of the loot files so the rail can\n")
        f.write("// order and label itself without pulling the loot into the client bundle.\n")
        f.write("// lib/rooms.ts holds no ranges on purpose — the pipeline owns them — and\n")
        f.write("// this file is the pipeline's answer rather than a second opinion.\n\n")
        f.write("export type Band = { min: number; max: number };\n\n")
        f.write("export const ROOM_BANDS: Record<string, Band> = {\n")
        for rid in sorted(rooms):
            b = rooms[rid]["band"]
            if b:
                f.write(f'  "{rid}": {{ min: {b["min"]}, max: {b["max"]} }},\n')
        f.write("};\n")

    # THE RAIL'S INDEX. Five numbers per item — id, the level it becomes
    # available, a bitmask of the classes it appears for, the slot it is
    # worn in, and the quality rank — in byRank order,
    # so the client can run panelFor's filter and cap without carrying
    # item level, names, sources or icons. 2,320 items land in ~30 KB instead of
    # the ~1 MB the loot files are, which is what makes a per-room count
    # affordable on a sidebar that renders on every page.
    #
    # PRE-SORTED IS THE POINT. byRank is a total order that does not depend on
    # class or level, so filtering this list preserves it: the client takes the
    # first eight of whatever survives and lands on exactly the set panelFor
    # would have chosen. Sorting client-side off a reduced record could not —
    # byRank breaks its last tie on the name, and the names are not here.
    #
    # THE SLOT IS THE PATH'S HALF. docs/DROPS.md step 6: /you says which of
    # your slots are behind and names the rooms that answer them, and that
    # question is per slot rather than per room. One small integer per item
    # buys it — an index into DROP_SLOTS rather than the word, because the
    # nineteen words repeat 2,320 times.
    quality_rank = {"Poor": 0, "Common": 1, "Uncommon": 2, "Rare": 3, "Epic": 4, "Legendary": 5}
    classes_in_order = sorted({c for r in rooms.values() for i in r["items"].values() for c in i["classes"]})
    slots_in_order = sorted({i["slot"] for r in rooms.values() for i in r["items"].values()})
    with open(DROPS_TS, "w") as f:
        f.write("// GENERATED by scripts/rooms-from-zones.py — do not edit.\n")
        f.write("//\n")
        f.write("// Every drop the rail counts and the path asks about, and nothing else.\n")
        f.write("// See the block above this file's writer in\n")
        f.write("// scripts/rooms-from-zones.py for why it is four numbers, and why the\n")
        f.write("// order it is in is load-bearing.\n\n")
        f.write("/** The class order the bitmask is written in. */\n")
        f.write("export const DROP_CLASSES = [\n")
        for c in classes_in_order:
            f.write(f'  "{c}",\n')
        f.write("] as const;\n\n")
        f.write("/** The slot vocabulary the fourth number indexes. */\n")
        f.write("export const DROP_SLOTS = [\n")
        for sl in slots_in_order:
            f.write(f'  "{sl}",\n')
        f.write("] as const;\n\n")
        f.write("/** The quality order the fifth number indexes. */\n")
        f.write("export const DROP_QUALITIES = [\n")
        for q in sorted(quality_rank, key=quality_rank.get):
            f.write(f'  "{q}",\n')
        f.write("] as const;\n\n")
        f.write("/** [itemId, availableAtLevel, classMask, slot, quality], best first. */\n")
        f.write("export type DropRow = [number, number, number, number, number];\n\n")
        f.write("export const ROOM_DROPS: Record<string, DropRow[]> = {\n")
        for rid in sorted(rooms):
            items = sorted(
                rooms[rid]["items"].values(),
                key=lambda i: (-quality_rank[i["quality"]], -i["itemLevel"], i["name"]),
            )
            rows = []
            for i in items:
                mask = 0
                for c in i["classes"]:
                    mask |= 1 << classes_in_order.index(c)
                slot = slots_in_order.index(i["slot"])
                rows.append(f'[{i["itemId"]},{i["availableAtLevel"]},{mask},{slot},{quality_rank[i["quality"]]}]')
            f.write(f'  "{rid}": [{",".join(rows)}],\n')
        f.write("};\n")

    total = sum(len(r["items"]) for r in rooms.values())
    print(f"{len(rooms)} rooms, {total} items -> {OUT}")
    if missing:
        print("no room for:", ", ".join(f"{k} ({v})" for k, v in sorted(missing.items())))
    if stale:
        print("stale, delete by hand:", ", ".join(sorted(f"reference/rooms/{s}.json" for s in stale)))


if __name__ == "__main__":
    main()
