#!/usr/bin/env python3
"""Wire + validate Tari guide rooms. Run from the repo root."""
import json, os, re, sys, glob

def camel(rid):
    p = rid.split("-")
    return p[0] + "".join(w.capitalize() for w in p[1:])

def wire(rooms):
    p = "lib/guide.ts"; s = open(p).read()
    for rid in rooms:
        if f'"../reference/guide/{rid}.json"' in s:
            continue
        line = f'import {camel(rid)} from "../reference/guide/{rid}.json";\n'
        imports = re.findall(r'^import \w+ from "\.\./reference/guide/[a-z0-9-]+\.json";\n', s, re.M)
        nxt = next((i for i in imports if i.split('guide/')[1] > f'{rid}.json"];'[:-3]), None)
        nxt = next((i for i in imports if i.split('guide/')[1].split('.json')[0] > rid), None)
        s = s.replace(nxt, line + nxt, 1) if nxt else s.replace(imports[-1], imports[-1] + line, 1)
        key = rid if re.fullmatch(r"[a-z][a-z0-9]*", rid) else f'"{rid}"'
        entry = f"  {key}: {camel(rid)} as GuideFile,\n"
        anchor = "};\n\nexport function guideFor"
        s = s.replace(anchor, entry + anchor, 1)
    open(p, "w").write(s)
    print("wired:", ", ".join(rooms))

KINDS = {"notice","look","story","before","beware"}
FORMS = {"title","chip","grave","yell","pages","six"}
LIMIT = 350

def check(rooms=None):
    ids = set(re.findall(r'id: "([a-z0-9\'-]+)", name:', open("lib/rooms.ts").read()))
    wired = open("lib/guide.ts").read()
    files = sorted(glob.glob("reference/guide/*.json"))
    ok = True; long_cards = []
    for f in files:
        g = json.load(open(f)); r = g["room"]
        if rooms and r not in rooms: 
            for c in g["cards"]:
                n = sum(len(l) for l in c["lines"])
                if n > LIMIT: long_cards.append((n, r, c["id"]))
            continue
        c = g["cards"]; t0 = c[0]
        bad = []
        if r not in ids: bad.append("not in rooms.ts")
        if os.path.basename(f)[:-5] != r: bad.append("filename/room mismatch")
        if not (10 <= len(c) <= 13): bad.append(f"card count {len(c)}")
        if not (t0["form"]=="title" and t0["kind"]=="before" and "t" not in t0 and "icon" not in t0):
            bad.append("title card")
        if len(g.get("sources",[])) < 5 or not all(s.startswith("https://warcraft.wiki.gg/") for s in g["sources"]):
            bad.append("sources")
        if len(g.get("roadEnds",[])) != 2: bad.append("roadEnds")
        if any(x["kind"] not in KINDS or x["form"] not in FORMS for x in c): bad.append("kind/form")
        ts = [x["t"] for x in c[1:] if "t" in x]   # roll-call cards own the whole stage
        if ts != sorted(ts) or not all(0 < x <= 1 for x in ts): bad.append("t order")
        if len({x["id"] for x in c}) != len(c): bad.append("dup ids")
        if "road" in g or any("at" in x for x in c): bad.append("has at/road")
        miss = [x["icon"] for x in c if x.get("icon") and not os.path.exists(f"public/story/{r}/{x['icon']}.png")]
        if miss: bad.append("missing icons: " + ",".join(miss))
        if any(x.get("spoiler") and x["form"] != "grave" for x in c): bad.append("spoiler not grave")
        if any(len(x["lines"]) > 3 for x in c): bad.append(">3 lines")
        if f'"../reference/guide/{r}.json"' not in wired or f"{camel(r)} as GuideFile" not in wired:
            bad.append("not wired")
        stray = []
        if os.path.isdir(f"public/story/{r}"):
            want = {x["icon"] for x in c if x.get("icon")}
            stray = sorted({p[:-4] for p in os.listdir(f"public/story/{r}") if p.endswith(".png")} - want)
        if stray: bad.append("stray icons: " + ",".join(stray))
        for x in c:
            n = sum(len(l) for l in x["lines"])
            if n > LIMIT: long_cards.append((n, r, x["id"]))
        print(f"  {r:26s} {len(c):2d} cards  {'OK' if not bad else 'FAIL: ' + '; '.join(bad)}")
        ok = ok and not bad
    if long_cards:
        ok = False
        print("  OVER", LIMIT, "CHARS:", sorted(long_cards, reverse=True))
    print(f"  total rooms told: {len(files)}")
    print("  ALL GOOD" if ok else "  PROBLEMS")
    return ok

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "wire": wire(sys.argv[2:])
    elif cmd == "check": check(sys.argv[2:] or None)
