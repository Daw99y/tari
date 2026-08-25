/* Pull every piece of gear a 1.12 character can wear out of the client.
 *
 *   node scripts/doll-items.mjs
 *
 * `doll-build.mjs` builds the bodies and a handful of named items to prove
 * each dressing path works. This builds the other side: the whole wardrobe —
 * about ten thousand equippable items across nine thousand looks — so the
 * bench can put any of them on.
 *
 * Two sources have to meet. `ItemDisplayInfo.dbc` says what a look is made of
 * but has no names and no idea which slot it belongs in; the ClassicDB dump's
 * `item_template` has the names, the slots and the qualities but points at a
 * look by id. Joining them on the display id gives a searchable wardrobe.
 *
 * The output is deliberately not in git. It is 90 MB of Blizzard's art, and
 * `docs/TARI.md` §7.1 says putting their work in front of users is a decision
 * to take on purpose. Run the script; the assets land under
 * public/lab/doll/items, which .gitignore covers.
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { readDbc } from "./dbc.mjs";
import { convertBlps, DATA, dbc112, extract, leaf, outName, parentOf } from "./client.mjs";

const DUMP = "/Users/daw99y/Documents/FLYFE/CPLUS/classic-db/Full_DB/ClassicDB_1_12_1_z2815.sql.gz";
const OUT = "public/lab/doll/items";
const TMP = ".doll-tmp/items";

/* `item_template`, by position. Only the first eleven columns are read; the
 * rest is stats, loot and vendor data this bench has no use for. */
const COL = { entry: 0, class: 1, subclass: 2, name: 3, displayId: 4, quality: 5, inventoryType: 10, itemLevel: 13 };

/* The display table has to be the client's own patched copy, and for a while
 * it was not — that is the whole story of the old 28,911 ceiling.
 *
 * An earlier build read `ItemDisplayInfo` from a dump that had been extracted
 * out of `dbc.MPQ` alone. That archive holds the table the client shipped
 * with at release — 23,852 rows, ceiling 29,059 — and every patch since has
 * carried a full replacement copy in `patch.MPQ` / `patch-2.MPQ`. Held against
 * the launch table, ClassicDB's display ids above ~28.9k looked like a later
 * client's: most had no row at all (the Fiery War Axe, the tier-one helms),
 * and the few that landed on one landed on the wrong armour. The ids were
 * 1.12's all along; the table was 1.0's. VMaNGOS, maintained independently
 * for 1.12.1 clients, agrees with ClassicDB on 2,295 of the 2,326 items the
 * ceiling used to drop.
 *
 * So there is no trusted-id ceiling any more. An item is drawable when its
 * display id has a row in the patched table, and whatever still misses is
 * counted and named rather than silently dropped. The same misread is baked
 * into CPLUS (`load_item_icons.py`, MAX_TRUSTED_DISPLAY_ID) and its icon
 * overlay exists to route around it; that is CPLUS's to unwind. */
const LAUNCH_CEILING = 29059;

/* Developer leftovers. The client's item table still carries placeholders,
 * balance tests, deprecated rows and the tier-test greens, and they sort into
 * the pickers alongside real gear — `10% Test Speed Boots` in with the boots.
 * They are real rows and the bench can still reach them, so they are marked
 * rather than dropped, and the panel hides them until asked.
 *
 * `Monster - Axe, 2H Horde Black Tombstone` is deliberately not in here. Those
 * are the weapons the NPCs carry, they are real art, and their names say what
 * they are. */
const LEFTOVER = /^\[ph\]|^\(?old\)?[^a-z]|deprecated|unused|\btest\b|^\d+ (green|epic|blue|rare)\b/i;

/* What each inventory type is, as far as drawing it goes. `slot` decides which
 * geoset families and body rectangles the item controls and which other items
 * it displaces; `attach` names the sockets its models hang from, and is absent
 * for the slots that are paint and geometry only.
 *
 * Sheathed and drawn positions use different sockets and are not wired up, so
 * everything held is drawn. A one-hander files under the main hand here
 * because that is the only slot its inventory type names; offering it in the
 * off hand as well is a wardrobe rule, and lives in `ALSO_OFFHAND` in
 * lib/wardrobe.ts. A bow has nowhere honest to go — its drawn pose is
 * two-handed and its sheathed pose is the back — so it is parked in the free
 * hand and given its own row rather than fighting the main hand for one. */
const INVENTORY = {
  1: { slot: "head", attach: [11] },
  // Necks, rings and trinkets are jewellery: no model, no overlay, no geoset.
  // They are here for their names and their icons, which is all a character
  // sheet asks of them, and having no `attach` is what keeps them off the body.
  2: { slot: "neck" },
  3: { slot: "shoulder", attach: [6, 5] },
  4: { slot: "shirt" },
  5: { slot: "chest" },
  6: { slot: "waist" },
  7: { slot: "legs" },
  8: { slot: "feet" },
  9: { slot: "wrist" },
  10: { slot: "hands" },
  11: { slot: "finger" },
  12: { slot: "trinket" },
  13: { slot: "mainhand", attach: [1] },
  14: { slot: "offhand", attach: [0] },
  15: { slot: "ranged", attach: [2] },
  16: { slot: "back" },
  17: { slot: "mainhand", attach: [1] },
  19: { slot: "tabard" },
  20: { slot: "chest" },
  21: { slot: "mainhand", attach: [1] },
  22: { slot: "offhand", attach: [2] },
  23: { slot: "offhand", attach: [2] },
  25: { slot: "ranged", attach: [1] },
  26: { slot: "ranged", attach: [2] },
};

/* The eight body rectangles an item can paint, in ItemDisplayInfo column
 * order from 14. The folder name is half the file name on disk, which is why
 * it is carried rather than derived. */
const BODY_TEX = [
  ["armUpper", "ArmUpperTexture"],
  ["armLower", "ArmLowerTexture"],
  ["hand", "HandTexture"],
  ["torsoUpper", "TorsoUpperTexture"],
  ["torsoLower", "TorsoLowerTexture"],
  ["legUpper", "LegUpperTexture"],
  ["legLower", "LegLowerTexture"],
  ["foot", "FootTexture"],
];

/* A head model ships once per race and gender, suffixed like `_HuM`. The
 * DBC names the family; the page appends the suffix for the body it is
 * drawing. */
const RACE_SUFFIX = /_(hu|or|dw|ni|sc|ta|gn|tr)(m|f)$/;

/* Body art is suffixed `_M`, `_F`, or `_U` when it is shared, and a few files
 * carry no suffix at all. The catalogue stores which of the four a stem has as
 * a bitmask, so the page asks for one file rather than probing for it. */
const SUFFIXES = [
  ["_M", 1],
  ["_F", 2],
  ["_U", 4],
  ["", 8],
];

/* ------------------------------------------------------------------ */

/** Every `INSERT INTO item_template` tuple in the dump, as arrays of strings.
 *
 *  A regex cannot do this: item names carry commas, brackets and escaped
 *  apostrophes — `Zamah\'s Note` — so the quoting has to be walked. */
function* tuples(sql) {
  for (let i = 0; i < sql.length; ) {
    if (sql[i] !== "(") {
      i++;
      continue;
    }
    i++;
    const values = [];
    let value = "";
    let quoted = false;
    for (; i < sql.length; i++) {
      const c = sql[i];
      if (quoted) {
        if (c === "\\") value += sql[++i];
        else if (c === "'") quoted = false;
        else value += c;
      } else if (c === "'") quoted = true;
      else if (c === ",") {
        values.push(value);
        value = "";
      } else if (c === ")") {
        values.push(value);
        i++;
        break;
      } else value += c;
    }
    yield values;
  }
}

/** Every equippable item, newest definition wins. Rows with no display id, or
 *  an inventory type no character sheet has a slot for — bags, ammo, quivers —
 *  never reach the wardrobe. */
function readItems() {
  const sql = execSync(`gzcat ${JSON.stringify(DUMP)} | grep '^INSERT INTO .item_template.'`, {
    maxBuffer: 1 << 30,
    encoding: "utf8",
  });
  const items = [];
  for (const t of tuples(sql)) {
    const inventoryType = +t[COL.inventoryType];
    const displayId = +t[COL.displayId];
    const where = INVENTORY[inventoryType];
    if (!where || !displayId) continue;
    const name = t[COL.name];
    items.push({
      entry: +t[COL.entry],
      name,
      displayId,
      inventoryType,
      quality: +t[COL.quality],
      itemLevel: +t[COL.itemLevel],
      leftover: LEFTOVER.test(name) ? 1 : 0,
    });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name) || a.entry - b.entry);
}

/** Every file under `dir`, indexed by the two keys the lookups need: the
 *  whole `folder/file` in lower case, and — for models — the bare name with
 *  any race-and-gender suffix taken off, which is how a helm's twelve
 *  variants are found from the one name the DBC gives. */
function indexFiles(dir) {
  const byPath = new Map();
  const models = new Map();
  const walk = (local, game) => {
    for (const entry of readdirSync(local, { withFileTypes: true })) {
      const child = join(local, entry.name);
      if (entry.isDirectory()) {
        walk(child, game ? `${game}\\${entry.name}` : entry.name);
        continue;
      }
      const path = `${game}\\${entry.name}`;
      byPath.set(`${parentOf(path)}\\${entry.name}`.toLowerCase(), path);
      if (!entry.name.toLowerCase().endsWith(".m2")) continue;
      const bare = entry.name.slice(0, -3).toLowerCase();
      for (const key of [bare, bare.replace(RACE_SUFFIX, "")]) {
        if (!models.has(key)) models.set(key, []);
        if (!models.get(key).includes(path)) models.get(key).push(path);
      }
    }
  };
  if (existsSync(dir)) walk(dir, "");
  return { byPath, models };
}

/** Every texture path an M2 names for itself: the type-0 entries of its
 *  texture table. Offsets are the vanilla layout `lib/m2.ts` reads — count at
 *  0x5c, offset at 0x60, 16-byte entries of type, flags, name length, name
 *  offset. */
function m2NamedTextures(file) {
  const b = readFileSync(file);
  if (b.length < 0x64 || b.toString("latin1", 0, 4) !== "MD20") return [];
  const n = b.readUInt32LE(0x5c);
  const o = b.readUInt32LE(0x60);
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = o + i * 16;
    if (e + 16 > b.length || b.readUInt32LE(e) !== 0) continue;
    const len = b.readUInt32LE(e + 8);
    const ofs = b.readUInt32LE(e + 12);
    if (len && ofs + len <= b.length) out.push(b.toString("latin1", ofs, ofs + len).replace(/\0+$/, ""));
  }
  return out;
}

function main() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(join(OUT, "m2"), { recursive: true });
  mkdirSync(join(OUT, "tex"), { recursive: true });
  mkdirSync(join(OUT, "icons"), { recursive: true });
  mkdirSync(TMP, { recursive: true });

  const items = readItems();
  const wanted = new Set(items.map((i) => i.displayId));
  console.log(`wardrobe  ${items.length} items across ${wanted.size} looks`);

  const idi = readDbc(dbc112("ItemDisplayInfo"));
  const hgv = readDbc(dbc112("HelmetGeosetVisData"));
  const maxId = idi.rows.reduce((n, r) => Math.max(n, r[0]), 0);
  if (maxId <= LAUNCH_CEILING)
    throw new Error(
      `ItemDisplayInfo tops out at ${maxId} — that is the launch table, not 1.12's. ` +
        `Delete .dbc-112/ and check the patch archives in ${DATA}.`,
    );
  console.log(`display   ${idi.nRec} rows in the patched ItemDisplayInfo, ceiling ${maxId}`);

  const rows = new Map(idi.rows.filter((r) => wanted.has(r[0])).map((r) => [r[0], r]));
  const orphans = items.filter((i) => !rows.has(i.displayId));
  console.log(`display   ${rows.size} looks found; ${orphans.length} items name a row the client does not have`);
  for (const i of orphans.slice(0, 8)) console.log(`  ! ${i.name} wants display ${i.displayId}`);

  /* --- lift the art out of the archives --- */
  // Three whole subtrees rather than a folder list: the extractor's pattern
  // reaches a subtree, and one pass over five archives costs seconds.
  console.log("extract   Item\\ObjectComponents, Item\\TextureComponents, Interface\\Icons");
  extract(["Item\\ObjectComponents\\*", "Item\\TextureComponents\\*"], TMP);
  extract(["Interface\\Icons\\*"], TMP, ["patch-2.MPQ", "patch.MPQ", "interface.MPQ"]);
  const files = indexFiles(TMP);
  console.log(`archives  ${files.byPath.size} files on disk`);

  /* --- work out what each look needs, and queue only that --- */
  const jobs = [];
  const queued = new Set();
  /** Queue a game path for conversion. Returns the file name it will land
   *  under, or null when the client does not ship it. */
  const want = (gamePath, sub) => {
    const local = files.byPath.get(`${parentOf(gamePath)}\\${leaf(gamePath)}`.toLowerCase());
    if (!local) return null;
    const name = outName(gamePath, ".webp");
    const dst = join(OUT, sub, name);
    if (!queued.has(dst)) {
      queued.add(dst);
      if (!existsSync(dst)) jobs.push([join(TMP, ...local.split("\\")), dst]);
    }
    return name;
  };

  /* The string pool. Model and texture names repeat hard across the
   * wardrobe — one `Mail_A_01Red` dresses dozens of looks — so the catalogue
   * stores indices and ships about a third of the size. */
  const pool = [""];
  const poolIndex = new Map([["", 0]]);
  const intern = (s) => {
    if (!s) return 0;
    let i = poolIndex.get(s);
    if (i === undefined) {
      i = pool.length;
      pool.push(s);
      poolIndex.set(s, i);
    }
    return i;
  };

  const display = {};
  let copied = 0;
  for (const [id, row] of rows) {
    const record = { g: [row[6], row[7], row[8]] };

    /* Models, and the folder they live in — which is also where their texture
     * is, and the only way to find it without a folder-guessing table. */
    for (const i of [0, 1]) {
      const named = idi.str(row[1 + i]);
      if (!named) continue;
      const bare = named.replace(/\.(mdx|mdl|m2)$/i, "").toLowerCase();
      const paths = files.models.get(bare);
      if (!paths?.length) continue;
      for (const path of paths) {
        const src = join(TMP, ...path.split("\\"));
        const dst = join(OUT, "m2", leaf(path));
        if (!existsSync(dst)) {
          copyFileSync(src, dst);
          copied++;
        }
        // Textures the model names for itself — the mod2x sheen on raid
        // shoulders, a hardcoded skin on some monster weapons. The DBC never
        // mentions these, so they are read out of the file and converted
        // beside the rest; the page derives their URLs from the same paths.
        for (const t of m2NamedTextures(src)) want(t, "tex");
      }
      // A head is `Helm_Leather_A_01_HuM.m2`; everything else is the bare
      // name. The page appends the suffix, so the catalogue stores the stem.
      const stem = leaf(paths[0]).slice(0, -3);
      const gendered = RACE_SUFFIX.test(stem.toLowerCase());
      record.m ??= [0, 0];
      record.m[i] = intern(gendered ? stem.replace(new RegExp(RACE_SUFFIX.source, "i"), "") : stem);
      if (gendered) record.r = 1;

      const tex = idi.str(row[3 + i]);
      if (tex) {
        const file = want(`Item\\ObjectComponents\\${parentOf(paths[0])}\\${tex}.blp`, "tex");
        if (file) {
          record.t ??= [0, 0];
          record.t[i] = intern(file);
        }
      }
    }

    /* A cloak has no model of its own — it is a geoset on the character
     * wearing the character's second texture slot — so its art is named in
     * the texture column with the model column empty. */
    if (!record.m) {
      const tex = idi.str(row[3]);
      const file = tex && want(`Item\\ObjectComponents\\Cape\\${tex}.blp`, "tex");
      if (file) record.t = [intern(file), 0];
    }

    /* Body rectangles. The stem goes in the catalogue and the page appends the
     * suffix, because item art is gendered and storing the resolved name for
     * both genders would double the catalogue.
     *
     * Which suffixes exist varies file by file, so the mask says which — the
     * page trying them in turn and taking whatever loads would work, but most
     * of the wardrobe is unisex, so it would mean a 404 for every overlay on
     * every change of gear. */
    const body = new Array(8).fill(0);
    const suffixes = new Array(8).fill(0);
    for (const [i, [, folder]] of BODY_TEX.entries()) {
      const name = idi.str(row[14 + i]);
      if (!name) continue;
      SUFFIXES.forEach(([sfx, bit]) => {
        if (want(`Item\\TextureComponents\\${folder}\\${name}${sfx}.blp`, "tex")) suffixes[i] |= bit;
      });
      if (suffixes[i]) body[i] = intern(name);
    }
    if (body.some(Boolean)) {
      record.b = body;
      record.bs = suffixes;
    }

    /* What a helm takes off, as the id of a HelmetGeosetVisData row. Which
     * groups that means depends on the race wearing it, so the table ships
     * with the catalogue and the page resolves it. */
    if (row[12] || row[13]) record.v = [row[12], row[13]];

    // A handful of rows name a .tga the archives only ship as .blp.
    const icon = idi.str(row[5]).replace(/\.[a-z0-9]+$/i, "");
    if (icon) {
      const file = want(`Interface\\Icons\\${icon}.blp`, "icons");
      if (file) record.i = intern(file);
    }

    display[id] = record;
  }

  /* --- convert --- */
  console.log(`convert   ${jobs.length} textures, ${copied} models copied`);
  convertBlps(jobs).then((bad) => {
    for (const [src, why] of bad) console.log(`  ! ${leaf(src.replace(/\//g, "\\"))}: ${why}`);

    const catalogue = {
      note: "Built by scripts/doll-items.mjs from a 1.12 client. Do not hand-edit.",
      inventory: INVENTORY,
      pool,
      // Positional and ragged: the leftover flag is only written when it is
      // set, which is one in fourteen rows.
      items: items
        .filter((i) => display[i.displayId])
        .map((i) => {
          const row = [i.entry, i.displayId, i.inventoryType, i.quality, i.itemLevel, i.name];
          return i.leftover ? [...row, 1] : row;
        }),
      untrusted: orphans.length,
      display,
      // Five race bitmasks per row: hair, beard, moustache, sideburns, ears.
      helmetVis: Object.fromEntries(hgv.rows.map((r) => [r[0], [r[1], r[2], r[3], r[4], r[5]]])),
    };
    writeFileSync(join(OUT, "catalogue.json"), JSON.stringify(catalogue) + "\n");
    rmSync(TMP, { recursive: true, force: true });

    const size = (dir) =>
      readdirSync(join(OUT, dir)).reduce((n, f) => n + statSync(join(OUT, dir, f)).size, 0) / 1e6;
    console.log("");
    console.log(`items     ${catalogue.items.length} wearable`);
    console.log(`models    ${readdirSync(join(OUT, "m2")).length} files, ${size("m2").toFixed(0)} MB`);
    console.log(`textures  ${readdirSync(join(OUT, "tex")).length} files, ${size("tex").toFixed(0)} MB`);
    console.log(`icons     ${readdirSync(join(OUT, "icons")).length} files, ${size("icons").toFixed(0)} MB`);
    console.log(`\nwrote ${OUT}/catalogue.json`);
  });
}

main();
