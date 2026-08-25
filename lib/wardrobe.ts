/* The wardrobe: every item a 1.12 character can wear, and what putting one on
 * means for the figure on screen.
 *
 * `scripts/doll-items.mjs` writes the catalogue this reads. It is the join of
 * two sources that each hold half the answer — `ItemDisplayInfo.dbc` knows
 * what a look is made of but has no names, and the ClassicDB `item_template`
 * dump has the names and slots but points at a look by id.
 *
 * Everything below is lookup, not judgement. The three mechanisms that dress
 * a character live in `lib/doll.ts`; this module only works out which models,
 * which overlays and which geoset groups one item hands them.
 */

import { ATTACH, SLOT_FAMILIES, type BodyLayer, type Region, type Worn } from "@/lib/doll";

/** Where the item art is served from.
 *
 *  The art is 12,460 files and does not go in the repo — Vercel fails a build
 *  above 15,000 of them — so in production it sits in a Blob store and this is
 *  that store's public base. Unset, it falls back to the local build, which is
 *  what `node scripts/doll-items.mjs` writes and what dev reads. A checkout
 *  with neither draws a naked character and says so.
 *
 *  Next inlines `NEXT_PUBLIC_` vars at build time, so changing this needs a
 *  redeploy rather than only a restart. */
export const WARDROBE = process.env.NEXT_PUBLIC_WARDROBE_URL?.replace(/\/+$/, "") || "/lab/doll/items";

/** The catalogue stays in the repo whatever the art does. It is one file, the
 *  CDN compresses it from 1.2 MB to about 200 KB at no charge, and shipping it
 *  beside the code that reads it means the two cannot drift apart. */
const CATALOGUE = "/lab/doll/items/catalogue.json";

/** A look's record, as the catalogue stores it. Short keys and pooled string
 *  indices: there are eight thousand of these and the page fetches the lot. */
type Display = {
  /** The three geoset group values, in the order the slot's families apply. */
  g: [number, number, number];
  /** Model stems, left and right. Pooled. */
  m?: number[];
  /** Set when the models are per race and gender and need a `_HuM` suffix. */
  r?: number;
  /** Model texture file names, left and right. Pooled, already resolved. */
  t?: number[];
  /** Body overlay stems, one per region in `BODY_TEX` order. Pooled. */
  b?: number[];
  /** Which suffixes each of those stems has on disk, as a bitmask. */
  bs?: number[];
  /** HelmetGeosetVisData row ids, male and female. */
  v?: number[];
  /** Icon file name. Pooled, already resolved. */
  i?: number;
};

export type Catalogue = {
  inventory: Record<string, { slot: string; attach?: number[] }>;
  pool: string[];
  /** entry, display id, inventory type, quality, item level, name, and a 1
   *  on the developer leftovers. Positional and ragged: the flag is only
   *  written when it is set. */
  items: [number, number, number, number, number, string, number?][];
  display: Record<string, Display>;
  helmetVis: Record<string, number[]>;
  /** How many items name a look the client's patched display table does not
   *  carry. Once ~2,300 strong, when the build compared against the launch-day
   *  table out of `dbc.MPQ` instead of the patched one — see doll-items.mjs. */
  untrusted: number;
};

export type Item = {
  entry: number;
  displayId: number;
  inventoryType: number;
  quality: number;
  itemLevel: number;
  name: string;
  slot: string;
  icon: string | null;
  /** A placeholder, a balance test, a deprecated row or a tier-test green.
   *  Real rows in the client, but not gear anyone wore. */
  leftover: boolean;
};

/** The eight body rectangles an item can paint, in the column order the
 *  catalogue stores them, with the folder half of each file name. */
const BODY_TEX: [Region, string][] = [
  ["armUpper", "ArmUpperTexture"],
  ["armLower", "ArmLowerTexture"],
  ["hand", "HandTexture"],
  ["torsoUpper", "TorsoUpperTexture"],
  ["torsoLower", "TorsoLowerTexture"],
  ["legUpper", "LegUpperTexture"],
  ["legLower", "LegLowerTexture"],
  ["foot", "FootTexture"],
];

/** Head models ship once per race and gender. Same codes the build script
 *  confirmed against the archive listing. */
const RACE_CODE: Record<number, string> = {
  1: "Hu",
  2: "Or",
  3: "Dw",
  4: "Ni",
  5: "Sc",
  6: "Ta",
  7: "Gn",
  8: "Tr",
};

/** The suffix each bit of the catalogue's mask stands for. */
const SUFFIX: Record<number, string> = { 1: "_M", 2: "_F", 4: "_U", 8: "" };

/** The five groups a helm can take off, in HelmetGeosetVisData column order. */
const HIDE_GROUPS = ["hair", "beard", "moustache", "sideburns", "ears"];

/** The file name a converted texture landed under: the last two segments of
 *  its game path, lowercased and squashed. Mirrors `outName` in the build. */
function texFile(folder: string, name: string): string {
  return `${folder}_${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "_") + ".webp";
}

/** Where a texture an item model names for itself landed — the mod2x sheen
 *  on raid shoulders, a hardcoded skin on some monster weapons. The build
 *  reads these names out of the model files and converts them beside the
 *  DBC-named art, so the URL is derived from the game path alone. */
export function namedTextureUrl(gamePath: string): string {
  const parts = gamePath.split("\\");
  const name = parts[parts.length - 1].replace(/\.[a-z0-9]+$/i, "");
  return `${WARDROBE}/tex/${texFile(parts[parts.length - 2] ?? "", name)}`;
}

export async function loadCatalogue(): Promise<Catalogue> {
  /* Always ask whether this is still the current list. The header on the file
   * says the same thing (next.config.mjs, CATALOGUE_PATH), but a browser that
   * was handed the old one still holds it for a day and will not ask — so a
   * rebuilt wardrobe would not reach a returning reader without a hard
   * refresh. Asking from this side does not care what is already cached. */
  const r = await fetch(CATALOGUE, { cache: "no-cache" });
  if (!r.ok) throw new Error(`no wardrobe: run \`node scripts/doll-items.mjs\` (${r.status})`);
  return r.json();
}

/* A one-hander files as inventory type 13, and that type names one slot: the
 * main hand. In the game a rogue holds one in each hand, so the picker offers
 * every one-hander in the off hand as well, as a second copy of the item whose
 * slot says which hand it is going in. The socket has to follow — the
 * catalogue's own attach for type 13 is the right hand — so the left one is
 * named here and `dress` prefers it for the off-hand copy.
 *
 * Two-handers and main-hand-only weapons are not in this table: neither can be
 * held in the off hand, and the shields, tomes and off-hand blades that carry
 * their own off-hand inventory type do not need it. */
const ALSO_OFFHAND: Record<number, number[]> = {
  13: [ATTACH.handLeft],
};

/** Every item, keyed by the slot it goes in. Sorted by name already, so the
 *  picker only has to filter. */
export function itemsBySlot(cat: Catalogue): Map<string, Item[]> {
  const bySlot = new Map<string, Item[]>();
  for (const [entry, displayId, inventoryType, quality, itemLevel, name, leftover] of cat.items) {
    const slot = cat.inventory[inventoryType]?.slot;
    if (!slot) continue;
    const icon = cat.display[displayId]?.i;
    const item: Item = {
      entry,
      displayId,
      inventoryType,
      quality,
      itemLevel,
      name,
      slot,
      icon: icon ? cat.pool[icon] : null,
      leftover: leftover === 1,
    };
    for (const s of ALSO_OFFHAND[inventoryType] ? [slot, "offhand"] : [slot]) {
      if (!bySlot.has(s)) bySlot.set(s, []);
      bySlot.get(s)!.push(s === slot ? item : { ...item, slot: s });
    }
  }
  return bySlot;
}

/** Every item, keyed by its id. `itemsBySlot` lists a one-hander twice, once
 *  per hand, under the one id; the copy that matches its own inventory type is
 *  the one kept here, and the caller says which hand through `handedFor`. */
export function itemsByEntry(cat: Catalogue): Map<number, Item> {
  const map = new Map<number, Item>();
  for (const [slot, rows] of itemsBySlot(cat)) for (const item of rows) if (item.slot === slot) map.set(item.entry, item);
  return map;
}

/** The gear slot a character's second weapon comes out of. */
const OFF_HAND = 17;

/** The same item, told which hand it is in. A one-hander files as a main-hand
 *  weapon whichever hand holds it, so gear slot 17 is re-slotted rather than
 *  taken at its word — take it at its word and both blades land on the one
 *  socket, and the character draws a single weapon instead of two. */
export function handedFor(at: number, item: Item): Item {
  return at === OFF_HAND && item.slot === "mainhand" ? { ...item, slot: "offhand" } : item;
}

/** One equipped item, resolved against the body wearing it. Everything here
 *  is a URL or a number the scene can use directly. */
export type Dressed = {
  item: Item;
  worn: Worn;
  /** Models to hang, with the socket each goes on. */
  models: { url: string; textureUrl: string | null; attach: number }[];
  /** Overlays for the composed body skin. */
  layers: BodyLayer[];
  /** A cloak is a geoset on the character, painted from the character's own
   *  second texture slot rather than from a model of its own. */
  capeUrl: string | null;
};

/** What this item does to this body. Null when the catalogue has no look for
 *  it, which is a build that has not been run rather than a broken item. */
export function dress(cat: Catalogue, item: Item, race: number, gender: number): Dressed | null {
  const d = cat.display[item.displayId];
  if (!d) return null;
  const where = cat.inventory[item.inventoryType];
  const suffix = `_${RACE_CODE[race] ?? "Hu"}${gender === 0 ? "M" : "F"}`;

  const models: Dressed["models"] = [];
  /* The off-hand copy of a one-hander goes on the left socket; everything else
   * goes where its inventory type says. */
  const sockets = (item.slot !== where?.slot ? ALSO_OFFHAND[item.inventoryType] : where?.attach) ?? [];
  (d.m ?? []).forEach((stem, i) => {
    if (!stem || !sockets.length) return;
    const name = cat.pool[stem] + (d.r ? suffix : "");
    const tex = d.t?.[i] || d.t?.[0];
    models.push({
      url: `${WARDROBE}/m2/${name}.m2`,
      textureUrl: tex ? `${WARDROBE}/tex/${cat.pool[tex]}` : null,
      attach: sockets[Math.min(i, sockets.length - 1)],
    });
  });

  /* Item art is gendered, and which of `_M`, `_F`, `_U` or no suffix at all
   * the client ships varies file by file. The build recorded which exist, so
   * the gendered file is asked for when there is one and the unisex sheet when
   * there is not — in that order, since a body with its own art should not get
   * the shared version. */
  const wanted = gender === 0 ? [1, 4, 8] : [2, 4, 8];
  const layers: BodyLayer[] = [];
  (d.b ?? []).forEach((stem, i) => {
    if (!stem) return;
    const [region, folder] = BODY_TEX[i];
    const mask = d.bs?.[i] ?? 0b1111;
    const urls = wanted
      .filter((bit) => mask & bit)
      .map((bit) => `${WARDROBE}/tex/${texFile(folder, cat.pool[stem] + SUFFIX[bit])}`);
    if (urls.length) layers.push({ region, urls });
  });

  /* What the helm takes off. The row holds one bitmask per group and the bit
   * is the race, so the same helm bares a night elf's ears and leaves a
   * dwarf's beard alone. */
  const hides: string[] = [];
  const visId = d.v?.[gender];
  const masks = visId ? cat.helmetVis[visId] : null;
  if (masks) HIDE_GROUPS.forEach((group, i) => ((masks[i] >> race) & 1 ? hides.push(group) : null));

  const capeTex = !d.m && d.t?.[0] ? cat.pool[d.t[0]] : null;
  return {
    item,
    worn: { slot: item.slot, geosetGroups: d.g, hides },
    models,
    layers,
    capeUrl: capeTex ? `${WARDROBE}/tex/${capeTex}` : null,
  };
}

/** Whether this slot has any effect on the character's own geometry. Used
 *  only to label the picker, so a slot that draws nothing is not mistaken for
 *  a slot that failed. */
export function slotDrawsGeometry(slot: string): boolean {
  return (SLOT_FAMILIES[slot]?.length ?? 0) > 0;
}
