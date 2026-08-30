/* Bake the hero rogue's shopping list into one small file.
 *
 * The landing page draws one pinned figure: human female, one look, ten
 * items. `SeducedFigure` used to fetch the full manifest (605 KB) and the
 * full catalogue (1.3 MB) to look up that handful of rows — two megafiles
 * in a chain, on the first page a visitor sees.
 *
 * This script cuts both files down to exactly what she uses and writes
 * `public/lab/doll/hero.json`: the one gender block with only her sections,
 * and a catalogue with only her ten items, its string pool re-packed. The
 * shapes are unchanged, so `dress()` and friends read it as-is.
 *
 * Run after `doll-build.mjs` or `doll-items.mjs` rewrite their outputs:
 *   node scripts/hero-bake.mjs
 *
 * The pins here mirror components/SeducedFigure.tsx (RACE, GENDER, LOOK,
 * OUTFIT). Change one, change the other.
 */

import { readFileSync, writeFileSync } from "node:fs";

const DOLL = new URL("../public/lab/doll/", import.meta.url);

const RACE = 1;
const GENDER = 1;
const LOOK = { skinColor: 3, faceVariation: 6, hairVariation: 14, hairColor: 7 };
const OUTFIT = [2264, 13108, 4119, 9455, 6727, 20117, 9624, 20114, 13033, 776];

const manifest = JSON.parse(readFileSync(new URL("manifest.json", DOLL), "utf8"));
const cat = JSON.parse(readFileSync(new URL("items/catalogue.json", DOLL), "utf8"));

/* --- the body: one gender block, only the sections her look reads --- */

const g = manifest.races.find((r) => r.race === RACE)?.genders.find((x) => x.gender === GENDER);
if (!g) throw new Error("no body in the manifest");

const hairStyle = g.hairStyles.find((h) => h.variation === LOOK.hairVariation) ?? g.hairStyles[0];
const wanted = [
  ["skin", 0, LOOK.skinColor],
  ["face", LOOK.faceVariation, LOOK.skinColor],
  ["underwear", 0, LOOK.skinColor],
  ["hair", hairStyle?.variation ?? 0, LOOK.hairColor],
];
const sections = g.sections.filter((s) =>
  wanted.some(([kind, variation, color]) => s.kind === kind && s.variation === variation && s.color === color),
);

const gender = {
  gender: g.gender,
  model: g.model,
  namedTextures: g.namedTextures,
  hairStyles: hairStyle ? [hairStyle] : [],
  sections,
};

/* --- the catalogue: her ten items, the pool re-packed around them --- */

const items = cat.items.filter((row) => OUTFIT.includes(row[0]));
const missing = OUTFIT.filter((e) => !items.some((row) => row[0] === e));
if (missing.length) throw new Error(`items not in the catalogue: ${missing.join(", ")}`);

// Index 0 stays the empty string: a 0 in a display row means "none".
const pool = [""];
const seen = new Map([["", 0]]);
const repool = (i) => {
  if (!i) return 0;
  const s = cat.pool[i];
  if (!seen.has(s)) {
    seen.set(s, pool.length);
    pool.push(s);
  }
  return seen.get(s);
};

const display = {};
const helmetVis = {};
for (const row of items) {
  const id = row[1];
  const d = cat.display[id];
  if (!d) throw new Error(`no display ${id} for item ${row[0]}`);
  display[id] = {
    ...d,
    ...(d.m ? { m: d.m.map(repool) } : {}),
    ...(d.t ? { t: d.t.map(repool) } : {}),
    ...(d.b ? { b: d.b.map(repool) } : {}),
    ...(d.i ? { i: repool(d.i) } : {}),
  };
  for (const v of d.v ?? []) if (v && cat.helmetVis[v]) helmetVis[v] = cat.helmetVis[v];
}

const hero = {
  g: gender,
  cat: { inventory: cat.inventory, pool, items, display, helmetVis, untrusted: 0 },
};

const out = new URL("hero.json", DOLL);
writeFileSync(out, JSON.stringify(hero));
console.log(`hero.json: ${(JSON.stringify(hero).length / 1024).toFixed(1)} KB, ${items.length} items, ${sections.length} sections`);
