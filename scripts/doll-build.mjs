/* Pull the paper-doll assets out of a 1.12 client.
 *
 *   node scripts/doll-build.mjs
 *
 * Reads the DBCs to work out which files a character and a list of items
 * need, lifts those files out of the MPQ archives, converts every BLP to PNG,
 * and writes public/lab/doll/manifest.json. Nothing is re-authored: the
 * manifest only ever names files that came out of the client.
 *
 * Gear is not built here. `doll-items.mjs` builds the wardrobe — every
 * equippable item in the client — out of ItemDisplayInfo and an item-name
 * database, and the page reads both.
 *
 * Column layouts below were pinned by dumping real rows, not from a doc.
 * CharHairGeosets (6 fields): id, race, gender, variation, geoset, show scalp.
 * CharacterFacialHairStyles (9 fields): race, gender, variation, three unused,
 *   then beard, sideburn and moustache variants — the last two swapped
 *   against the family order the models use.
 * CharSections (10 fields):
 *   0 id · 1 race · 2 gender · 3 base section · 4 variation · 5 colour ·
 *   6-8 texture · 9 flags
 *
 * Archive scans cost about three seconds each, so everything is grouped by
 * folder and pulled in one pass per folder, and the BLPs all convert in a
 * single Pillow process at the end.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { readDbc } from "./dbc.mjs";

const CLIENT = "/Users/daw99y/Downloads/WoW Classic";
const DATA = join(CLIENT, "app/Data");
const EXTRACTOR = join(CLIENT, "MPQExtractor/build/bin/MPQExtractor");
const DBC = "/Users/daw99y/Documents/FLYFE/CPLUS/data/raw/dbc-all";
const OUT = "public/lab/doll";
const TMP = ".doll-tmp";

/* Patches override the base archives, so they are searched first. */
const ARCHIVES = ["patch-2.MPQ", "patch.MPQ", "model.MPQ", "texture.MPQ", "interface.MPQ"];

/* What to build: every playable race, both genders, out of one run so the
 * archives are only scanned once. A scan costs about four seconds and there
 * are a couple of dozen folders, so grouping matters more than anything else
 * here. Goblin (9) has models but was never playable, so it is left out. */
const RACES = [1, 2, 3, 4, 5, 6, 7, 8];
const GENDERS = [0, 1];

const genderName = (g) => (g === 0 ? "Male" : "Female");

/* Which look each body opens on. */
const LOOK = { skinColor: 0, faceVariation: 0, hairVariation: 1, hairColor: 0, facialHair: 1 };

/* What each of the three CharSections texture columns is for, by section kind.
 * Confirmed by dumping rows across every race: for a hair row the columns are
 * the hair mesh's texture, the scalp's lower half and its upper half. */
const SECTION = { 0: "skin", 1: "face", 2: "facialHair", 3: "hair", 4: "underwear" };
const ROLES = {
  // A skin row names the body texture and a second "extra" sheet, shared by
  // groups of three colours. The extra fills texture slot 8, which is what a
  // tauren's mane and braids are mapped to.
  skin: ["skin", "extra"],
  face: ["lower", "upper"],
  facialHair: ["lower", "upper"],
  hair: ["hair", "scalpLower", "scalpUpper"],
  underwear: ["pelvis", "torso"],
};

/* ------------------------------------------------------------------ */

/** The last segment of a game path. These use backslashes, which node's
 *  `basename` does not split on, so it cannot do this job. */
function leaf(p) {
  return p.slice(p.lastIndexOf("\\") + 1);
}
function folderOf(p) {
  // `Character\Human\Male\...` collapses to `Character\Human`: the
  // extractor's pattern reaches a whole subtree, so one scan covers both
  // genders instead of two.
  const parts = p.split("\\");
  if (parts[0].toLowerCase() === "character" && parts.length > 2) return `${parts[0]}\\${parts[1]}`;
  return p.slice(0, p.lastIndexOf("\\"));
}

/** Where an extracted file lands. `-f` keeps the archive's own hierarchy,
 *  which it has to: every race ships a `Character\\<Race>\\Hair00_00.blp`,
 *  and flattening turns eight different haircuts into one file. */
function rawPath(gamePath) {
  return join(TMP, "raw", ...gamePath.split("\\"));
}

/** The textures an .m2 names by filename rather than leaving for the game to
 *  fill in. Most character models name none; the night elves and the undead
 *  name an eye glow, and the gnome male a second skin. Without these the
 *  geoset that uses one draws untextured. */
function namedTextures(m2Path) {
  const b = readFileSync(m2Path);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u32 = (o) => dv.getUint32(o, true);
  const ascii = (o, n) => {
    let out = "";
    for (let i = 0; i < n; i++) {
      const c = dv.getUint8(o + i);
      if (!c) break;
      out += String.fromCharCode(c);
    }
    return out;
  };
  const count = u32(0x5c);
  const off = u32(0x60);
  const paths = [];
  for (let i = 0; i < count; i++) {
    const p = off + i * 16;
    if (u32(p) === 0) paths.push(ascii(u32(p + 12), u32(p + 8)));
  }
  return paths.filter(Boolean);
}

/** The name a converted file takes under OUT/tex. The whole game path, so it
 *  stays unique across races. */
function outName(gamePath, ext) {
  return gamePath.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "_") + ext;
}

/** Pull every folder named in `paths` out of the archives, into TMP/raw.
 *  One archive scan per folder per archive, patches first so a patched copy
 *  of a file wins. Returns the set of local file names that arrived. */
function extractFolders(paths) {
  const folders = [...new Set(paths.map(folderOf))];
  const dir = join(TMP, "raw");
  mkdirSync(dir, { recursive: true });
  // Later archives must not overwrite a patch's copy, so extract in reverse
  // priority and let each pass clobber the one before it.
  for (const archive of [...ARCHIVES].reverse()) {
    for (const folder of folders) {
      try {
        execFileSync(EXTRACTOR, ["-e", `${folder}\\*`, "-f", "-o", dir, join(DATA, archive)], { stdio: "ignore" });
      } catch {
        /* A folder missing from an archive is normal. */
      }
    }
  }
  return dir;
}

/** Convert the named BLPs to PNG under OUT/tex, in one Pillow process.
 *  Returns a map of game path → png file name for the ones that converted. */
function convert(gamePaths) {
  const jobs = [];
  const out = new Map();
  for (const gp of gamePaths) {
    const png = outName(gp, ".webp");
    const dst = join(OUT, "tex", png);
    if (existsSync(dst)) {
      out.set(gp, png);
      continue;
    }
    const src = rawPath(gp);
    if (!existsSync(src)) continue;
    jobs.push([src, dst]);
    out.set(gp, png);
  }
  if (!jobs.length) return out;
  // scripts/blp.py, not Pillow directly: Pillow drops the alpha plane on
  // palettised BLPs, which is every item overlay in the client.
  const bad = JSON.parse(
    execFileSync("python3", ["scripts/blp.py"], { input: JSON.stringify(jobs), encoding: "utf8" }),
  );
  for (const [src, why] of bad) {
    console.log(`  ! ${src}: ${why}`);
    for (const gp of [...out.keys()]) if (rawPath(gp) === src) out.delete(gp);
  }
  return out;
}

/** The average colour of a texture's opaque pixels, as #rrggbb. */
function swatch(pngPath) {
  const script = `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
r = g = b = n = 0
for px in im.getdata():
    if px[3] > 128:
        r += px[0]; g += px[1]; b += px[2]; n += 1
print('#%02x%02x%02x' % ((r//n, g//n, b//n) if n else (0, 0, 0)))
`;
  return execFileSync("python3", ["-c", script, pngPath], { encoding: "utf8" }).trim();
}

/** Everything one body needs, worked out before any archive is touched. */
function plan(race, gender, dbcs) {
  const { cs, chg, cfh, raceFolder } = dbcs;
  const folder = raceFolder(race);
  const model = `Character\\${folder}\\${genderName(gender)}\\${folder}${genderName(gender)}.m2`;

  const sections = [];
  for (const r of cs.rows) {
    // Flag 1 marks the NPC-only variants; taking them gives two skins per colour.
    if (r[1] !== race || r[2] !== gender || r[9] !== 0) continue;
    const kind = SECTION[r[3]];
    if (!kind) continue;
    // The three texture columns are positional, and each kind uses them for a
    // fixed job. Dropping the empty ones would slide a scalp texture into the
    // hair slot, which is how a tauren ends up wearing armour on its mane.
    const roles = {};
    ROLES[kind].forEach((role, i) => {
      const path = cs.str(r[6 + i]);
      // A handful of rows name a .tga that the archives only ship as .blp.
      if (path) roles[role] = path.replace(/\.tga$/i, ".blp");
    });
    sections.push({ kind, variation: r[4], color: r[5], roles });
  }

  /* Which mesh each hair style is. The style index in CharSections is not the
   * geoset id — style 1 is geoset 2 for a human male — so the page has to look
   * the mesh up rather than draw the index. */
  const hairStyles = chg.rows
    .filter((r) => r[1] === race && r[2] === gender)
    .map((r) => ({ variation: r[3], geoset: r[4], showScalp: r[5] === 1 }))
    .sort((a, b) => a.variation - b.variation);

  /* Beard, moustache and sideburns. Race, gender, variation, in that order —
   * columns 3 to 5 hold leftover values that are not geosets, and the two
   * geoset columns after the beard are stored swapped: column 7 is the
   * sideburn (family 3) and column 8 the moustache (family 2). Both facts
   * were pinned by checking every row against the meshes the sixteen body
   * models actually carry: this reading matches 94 of 115 rows in full, and
   * every other reading matches at most 51. Rows are kept even when the body
   * has no facial-hair paint: a tauren's mane and a human female's earrings
   * are all mesh, painted by the hair or the skin, and the page already drops
   * any style whose meshes the model does not carry. */
  const facialStyles = cfh.rows
    .filter((r) => r[0] === race && r[1] === gender)
    .map((r) => ({ variation: r[2], geosets: [r[6], r[8], r[7]] }))
    .sort((a, b) => a.variation - b.variation);

  return {
    race,
    gender,
    model,
    sections,
    hairStyles,
    facialStyles,
    texPaths: sections.flatMap((s) => Object.values(s.roles)),
    modelPaths: [model],
  };
}

/** A swatch per colour index, averaged from the art, so the pickers show
 *  colours rather than the numbers 0 to 9. `match` picks the most
 *  representative texture of the row; a tauren's mane is painted into the face
 *  and names no hair texture at all, so any file in the row will do when
 *  nothing matches. */
function swatches(sections, kind, role, png) {
  const out = [];
  for (const s of sections) {
    if (s.kind !== kind || out[s.color]) continue;
    // A tauren's mane names no hair texture at all, so fall back to whatever
    // the row does name.
    const file =
      png.get(s.roles[role] ?? "") ?? Object.values(s.roles).map((p) => png.get(p)).find(Boolean);
    if (file) out[s.color] = swatch(join(OUT, "tex", file));
  }
  return out;
}

function main() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(join(OUT, "m2"), { recursive: true });
  mkdirSync(join(OUT, "tex"), { recursive: true });

  const cr = readDbc(join(DBC, "ChrRaces.dbc"));
  const raceRow = (race) => cr.rows.find((r) => r[0] === race);
  /* Column 15 is the model folder (NightElf, Scourge), 17 the name people use
   * (Night Elf, Undead). Columns 26 and 28 hold the word this race uses for
   * its facial-hair row — Tusks, Horns, Features — or NORMAL when the plain
   * label will do. */
  const raceFolder = (race) => cr.str(raceRow(race)[15]);
  const raceName = (race) => cr.str(raceRow(race)[17]);
  const facialLabel = (race) => {
    for (const col of [28, 26]) {
      const word = cr.str(raceRow(race)[col]);
      if (word && word !== "NORMAL") return word[0] + word.slice(1).toLowerCase();
    }
    return "Facial hair";
  };

  const dbcs = {
    cs: readDbc(join(DBC, "CharSections.dbc")),
    chg: readDbc(join(DBC, "CharHairGeosets.dbc")),
    cfh: readDbc(join(DBC, "CharacterFacialHairStyles.dbc")),
    raceFolder,
  };

  const plans = RACES.flatMap((race) => GENDERS.map((g) => plan(race, g, dbcs)));

  /* --- One extraction and one conversion pass for the lot. --- */
  const allTex = [...new Set(plans.flatMap((p) => p.texPaths))];
  const allModels = [...new Set(plans.flatMap((p) => p.modelPaths))];
  console.log(`need      ${allModels.length} models, ${allTex.length} textures across ${plans.length} bodies`);

  // Anything already converted needs neither extracting nor decoding, so a
  // re-run after a rule change costs seconds instead of eight minutes. Delete
  // public/lab/doll/tex to force the lot.
  const missingTex = allTex.filter((t) => !existsSync(join(OUT, "tex", outName(t, ".webp"))));
  const missingModels = allModels.filter((m) => !existsSync(join(OUT, "m2", leaf(m))));
  console.log(`have      ${allTex.length - missingTex.length} textures already; fetching ${missingTex.length}`);
  if (missingTex.length || missingModels.length) extractFolders([...missingModels, ...missingTex]);
  for (const mp of missingModels) {
    const src = rawPath(mp);
    if (!existsSync(src)) {
      console.log(`  ! missing model ${mp}`);
      continue;
    }
    renameSync(src, join(OUT, "m2", leaf(mp)));
  }
  /* A character model can name textures of its own, and we only learn which
   * once the file is on disk. Cheap second pass: the missing-file check above
   * means nothing already fetched is fetched twice. */
  const extra = [];
  for (const p of plans) {
    const local = join(OUT, "m2", leaf(p.model));
    if (existsSync(local)) extra.push(...namedTextures(local));
  }
  const missingExtra = [...new Set(extra)].filter((t) => !existsSync(join(OUT, "tex", outName(t, ".webp"))));
  if (missingExtra.length) {
    console.log(`named     ${new Set(extra).size} textures named inside the models; fetching ${missingExtra.length}`);
    extractFolders(missingExtra);
  }

  const png = convert([...allTex, ...new Set(extra)]);

  /* --- Assemble. --- */
  const manifest = {
    note: "Built by scripts/doll-build.mjs from a 1.12 client. Do not hand-edit.",
    look: LOOK,
    races: RACES.map((race) => ({
      race,
      name: raceName(race),
      facialLabel: facialLabel(race),
      genders: plans
        .filter((p) => p.race === race)
        .map((p) => ({
          gender: p.gender,
          name: genderName(p.gender),
          model: existsSync(join(OUT, "m2", leaf(p.model))) ? leaf(p.model) : null,
          namedTextures: Object.fromEntries(
            (existsSync(join(OUT, "m2", leaf(p.model))) ? namedTextures(join(OUT, "m2", leaf(p.model))) : [])
              .map((t) => [outName(t, ".webp"), png.get(t)])
              .filter(([, file]) => file),
          ),
          hairStyles: p.hairStyles,
          facialStyles: p.facialStyles,
          hairColors: swatches(p.sections, "hair", "hair", png),
          skinColors: swatches(p.sections, "skin", "skin", png),
          sections: p.sections
            .map((sec) => {
              const files = {};
              for (const [role, path] of Object.entries(sec.roles)) {
                const file = png.get(path);
                if (file) files[role] = file;
              }
              return { kind: sec.kind, variation: sec.variation, color: sec.color, files };
            })
            .filter((sec) => Object.keys(sec.files).length),
        }))
        .filter((b) => b.model),
    })).filter((r) => r.genders.length),
  };
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest) + "\n");
  rmSync(TMP, { recursive: true, force: true });

  console.log("");
  for (const r of manifest.races)
    for (const b of r.genders) {
      const faces = new Set(b.sections.filter((sec) => sec.kind === "face").map((sec) => sec.variation)).size;
      console.log(
        `${r.name.padEnd(10)} ${b.name.padEnd(7)} ${String(b.skinColors.filter(Boolean).length).padStart(2)} skins  ` +
          `${String(faces).padStart(2)} faces  ${String(b.hairStyles.length).padStart(2)} hair × ` +
          `${String(b.hairColors.filter(Boolean).length).padStart(2)}  ${String(b.facialStyles.length).padStart(2)} ${r.facialLabel.toLowerCase()}`,
      );
    }
  console.log(`\nwrote ${OUT}/manifest.json`);
}

main();
