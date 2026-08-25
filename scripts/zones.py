"""Which room is which zone, in the two vocabularies the map pipeline needs.

Three names exist for one place and none of them match. Tari calls it
`the-hinterlands`; the client's art folder calls it `Hinterlands`; pfQuest
records spawns against area id 47. Both map scripts need the crossing, so it
is written once, here.

The client's names are its own, misspellings included — Ogrimmar, Darnassis,
Hilsbrad, Aszhara. That is why this is a table and not a slug function: a
fuzzy match that guesses one of them wrong puts a zone's pins on somebody
else's picture, and nothing downstream would catch it.

Area ids come from WorldMapArea.dbc, read straight out of a 1.12 client. To
regenerate after a client change, print `dbc("WorldMapArea")` from
map-plates-client.py.
"""

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# room id -> (the client's name for the map, pfQuest area id)
ZONES = {
    "stormwind-city": ("Stormwind", 1519),
    "ironforge": ("Ironforge", 1537),
    "undercity": ("Undercity", 1497),
    "darnassus": ("Darnassis", 1657),
    "orgrimmar": ("Ogrimmar", 1637),
    "thunder-bluff": ("ThunderBluff", 1638),
    "alterac-mountains": ("Alterac", 36),
    "arathi-highlands": ("Arathi", 45),
    "badlands": ("Badlands", 3),
    "blasted-lands": ("BlastedLands", 4),
    "burning-steppes": ("BurningSteppes", 46),
    "deadwind-pass": ("DeadwindPass", 41),
    "dun-morogh": ("DunMorogh", 1),
    "duskwood": ("Duskwood", 10),
    "eastern-plaguelands": ("EasternPlaguelands", 139),
    "elwynn-forest": ("Elwynn", 12),
    "hillsbrad-foothills": ("Hilsbrad", 267),
    "loch-modan": ("LochModan", 38),
    "redridge-mountains": ("Redridge", 44),
    "searing-gorge": ("SearingGorge", 51),
    "silverpine-forest": ("Silverpine", 130),
    "stranglethorn-vale": ("Stranglethorn", 33),
    "swamp-of-sorrows": ("SwampOfSorrows", 8),
    "the-hinterlands": ("Hinterlands", 47),
    "tirisfal-glades": ("Tirisfal", 85),
    "western-plaguelands": ("WesternPlaguelands", 28),
    "westfall": ("Westfall", 40),
    "wetlands": ("Wetlands", 11),
    "ashenvale": ("Ashenvale", 331),
    "azshara": ("Aszhara", 16),
    "darkshore": ("Darkshore", 148),
    "desolace": ("Desolace", 405),
    "durotar": ("Durotar", 14),
    "dustwallow-marsh": ("Dustwallow", 15),
    "felwood": ("Felwood", 361),
    "feralas": ("Feralas", 357),
    "moonglade": ("Moonglade", 493),
    "mulgore": ("Mulgore", 215),
    "silithus": ("Silithus", 1377),
    "stonetalon-mountains": ("StonetalonMountains", 406),
    "tanaris": ("Tanaris", 440),
    "teldrassil": ("Teldrassil", 141),
    "the-barrens": ("Barrens", 17),
    "thousand-needles": ("ThousandNeedles", 400),
    "un-goro-crater": ("UngoroCrater", 490),
    "winterspring": ("Winterspring", 618),
}


def room_names():
    """id -> display name, straight out of lib/rooms.ts, so a room is named
    once. The same read scripts/rooms-from-zones.py makes."""
    src = open(os.path.join(ROOT, "lib", "rooms.ts")).read()
    return dict(re.findall(r'id: "([a-z0-9-]+)", name: "([^"]+)"', src))
