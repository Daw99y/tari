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

import { SLOT_FAMILIES, type BodyLayer, type Region, type Worn } from "@/lib/doll";

export const WARDROBE = "/lab/doll/items";

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
  /** How many items were dropped for naming a look from a later client. */
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

export async function loadCatalogue(): Promise<Catalogue> {
  const r = await fetch(`${WARDROBE}/catalogue.json`);
  if (!r.ok) throw new Error(`no wardrobe: run \`node scripts/doll-items.mjs\` (${r.status})`);
  return r.json();
}

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
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot)!.push(item);
  }
  return bySlot;
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
  const sockets = where?.attach ?? [];
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
