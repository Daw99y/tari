#!/usr/bin/env python3
"""Rewrite docs/TELLING.md §6 from what is actually on disk."""
import glob, os, re, textwrap
NUM = {6:"six",7:"seven",11:"eleven",12:"twelve",16:"sixteen",17:"seventeen",21:"twenty-one",22:"twenty-two",
       25:"twenty-five",27:"twenty-seven",28:"twenty-eight",31:"thirty-one",33:"thirty-three",34:"thirty-four",
       37:"thirty-seven",39:"thirty-nine",40:"forty",42:"forty-two",43:"forty-three",45:"forty-five",
       46:"forty-six",48:"forty-eight",49:"forty-nine",51:"fifty-one",52:"fifty-two",54:"fifty-four",
       55:"fifty-five",57:"fifty-seven",58:"fifty-eight",61:"sixty-one",63:"sixty-three",64:"sixty-four",
       67:"sixty-seven",69:"sixty-nine",70:"seventy",73:"seventy-three",75:"seventy-five",76:"seventy-six",
       79:"seventy-nine",4:"four",8:"eight",9:"nine",10:"ten",13:"thirteen",14:"fourteen",15:"fifteen",
       18:"eighteen",19:"nineteen",20:"twenty",23:"twenty-three",24:"twenty-four",26:"twenty-six",
       29:"twenty-nine",30:"thirty",32:"thirty-two",35:"thirty-five",36:"thirty-six",38:"thirty-eight",
       41:"forty-one",44:"forty-four",47:"forty-seven",50:"fifty",53:"fifty-three",56:"fifty-six",
       59:"fifty-nine",60:"sixty",62:"sixty-two",65:"sixty-five",66:"sixty-six",68:"sixty-eight",
       71:"seventy-one",72:"seventy-two",74:"seventy-four",77:"seventy-seven",78:"seventy-eight",0:"none",
       1:"one",2:"two",3:"three",5:"five"}
WAVE3 = "the-deadmines redridge-mountains stonetalon-mountains ashenvale wailing-caverns hillsbrad-foothills wetlands blackfathom-deeps razorfen-kraul the-stockade thousand-needles".split()
WAVE4 = ("gnomeregan alterac-mountains arathi-highlands desolace stranglethorn-vale scarlet-monastery badlands "
         "dustwallow-marsh swamp-of-sorrows razorfen-downs uldaman feralas tanaris the-hinterlands searing-gorge "
         "zul-farrak azshara blasted-lands maraudon felwood un-goro-crater the-temple-of-atal-hakkar").split()
WAVE5 = ("blackrock-depths burning-steppes moonglade western-plaguelands dire-maul-east eastern-plaguelands "
         "silithus winterspring deadwind-pass dire-maul-north dire-maul-west lower-blackrock-spire stratholme "
         "scholomance upper-blackrock-spire molten-core blackwing-lair ahn-qiraj naxxramas onyxia-s-lair "
         "ruins-of-ahn-qiraj blackrock-mountain gadgetzan northshire ratchet").split()

told = sorted(os.path.basename(p)[:-5] for p in glob.glob("reference/guide/*.json"))
left = [r for w in (WAVE3, WAVE4, WAVE5) for r in w if r not in told]
n_told, n_left = len(told), len(left)

def wrap(rs): return textwrap.fill(", ".join(rs), 74, break_on_hyphens=False)

def block(title, rooms):
    rooms = [r for r in rooms if r not in told]
    if not rooms: return ""
    body = wrap(rooms)
    return f"\n**{title} ({len(rooms)})**\n{body}\n"

sec = (f"## 6. What is left — {NUM[n_left]} rooms\n\n"
       f"Written: {wrap(told)}.\n"
       + block("Wave 3 — the 10-30 band and its dungeons", WAVE3)
       + block("Wave 4 — the 30-50 band and its dungeons", WAVE4)
       + block("Wave 5 — the endgame, the hubs and the raids", WAVE5))

p = "docs/TELLING.md"; s = open(p).read()
s = re.sub(r"## 6\. What is left.*?(?=\n\*\*Six rooms per batch\*\*)", sec + "\n", s, flags=re.S)
s = re.sub(r"\*\*[A-Z][a-z-]+(?:-[a-z]+)* of seventy-nine rooms are told\. This is how the other [a-z-]+\n?get written\.\*\*",
           f"**{NUM[n_told].capitalize()} of seventy-nine rooms are told. This is how the other\n{NUM[n_left]} get written.**", s)
s = re.sub(r"\*\*[A-Z][a-z-]+ of seventy-nine rooms are told\. This is how the other\n[a-z-]+ get written\.\*\*",
           f"**{NUM[n_told].capitalize()} of seventy-nine rooms are told. This is how the other\n{NUM[n_left]} get written.**", s)
open(p, "w").write(s)
print(f"TELLING §6: {n_told} told, {n_left} left")
