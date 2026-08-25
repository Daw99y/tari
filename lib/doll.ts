/* The rules that turn "a human male wearing these items" into a drawable set
 * of meshes and one body texture.
 *
 * Three separate mechanisms decide what a dressed character looks like, and
 * nothing in the M2 file says which is which — the knowledge lives here.
 *
 *  1. Held and worn *models*. A sword, a shield, a helm, two shoulders. Each
 *     is its own .m2, hung off a numbered attachment point on a bone.
 *  2. Body *texture*. Chests, legs, gloves and boots have no geometry at all.
 *     They are painted into fixed rectangles of one 256×256 skin, over the
 *     bare body. `BODY_REGIONS` is that layout.
 *  3. Geoset *visibility*. The character file carries every glove, boot,
 *     sleeve and robe skirt at once. An item switches its own variant on and
 *     leaves the rest off.
 *
 * The region table was derived from the art, not from a doc: every overlay
 * the client ships is 128 pixels wide, and the two 128-pixel columns of the
 * skin each add up to exactly 256 tall.
 */

export type Rect = { x: number; y: number; w: number; h: number };

/** Where each overlay lands on the 256×256 body skin. */
export const BODY_REGIONS = {
  armUpper: { x: 0, y: 0, w: 128, h: 64 },
  armLower: { x: 0, y: 64, w: 128, h: 64 },
  hand: { x: 0, y: 128, w: 128, h: 32 },
  faceUpper: { x: 0, y: 160, w: 128, h: 32 },
  faceLower: { x: 0, y: 192, w: 128, h: 64 },
  torsoUpper: { x: 128, y: 0, w: 128, h: 64 },
  torsoLower: { x: 128, y: 64, w: 128, h: 32 },
  legUpper: { x: 128, y: 96, w: 128, h: 64 },
  legLower: { x: 128, y: 160, w: 128, h: 64 },
  foot: { x: 128, y: 224, w: 128, h: 32 },
} satisfies Record<string, Rect>;

export type Region = keyof typeof BODY_REGIONS;

/* ---------- attachments ---------- */

/** Attachment ids, confirmed against HumanMale.m2: 34 sockets, ids 0–33, each
 *  on a bone whose height and side match the name it is given here. */
export const ATTACH = {
  shield: 0,
  handRight: 1,
  handLeft: 2,
  shoulderRight: 5,
  shoulderLeft: 6,
  helm: 11,
  back: 12,
} as const;

/** The slots the panel offers, top to bottom, and what to call each one.
 *  Ordered the way a character sheet reads rather than the way the inventory
 *  types are numbered. */
export const SLOT_ORDER = [
  "head",
  "shoulder",
  "back",
  "chest",
  "shirt",
  "tabard",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "mainhand",
  "offhand",
  "ranged",
] as const;

export const SLOT_LABEL: Record<string, string> = {
  head: "Head",
  shoulder: "Shoulders",
  back: "Back",
  chest: "Chest",
  shirt: "Shirt",
  tabard: "Tabard",
  wrist: "Wrists",
  hands: "Hands",
  waist: "Waist",
  legs: "Legs",
  feet: "Feet",
  mainhand: "Main hand",
  offhand: "Off hand",
  ranged: "Ranged",
};

/** The order the body overlays stack in. Gloves paint over a sleeve and a
 *  belt paints over both the chest and the legs, so a chest piece put on last
 *  would rub out the boots. Anything not named here paints before the lot. */
export const LAYER_ORDER = [
  "shirt",
  "chest",
  "legs",
  "feet",
  "wrist",
  "hands",
  "waist",
  "tabard",
  "back",
];

/** Item quality, as the game colours it. */
export const QUALITY = [
  "#9d9d9d",
  "#ffffff",
  "#1eff00",
  "#0070dd",
  "#a335ee",
  "#ff8000",
  "#e6cc80",
  "#e6cc80",
] as const;

/** Which side each race starts on. Not in any DBC column worth trusting, and
 *  it has not changed since 2004 — the creation screen splits on it, so the
 *  picker does too. */
export const FACTION: Record<number, "Alliance" | "Horde"> = {
  1: "Alliance",
  3: "Alliance",
  4: "Alliance",
  7: "Alliance",
  2: "Horde",
  5: "Horde",
  6: "Horde",
  8: "Horde",
};

/** What each race calls its two head rows.
 *
 *  `ChrRaces` holds these words but not cleanly: column 28 labels the hair row
 *  and is right for a tauren (Horns), column 27 labels the facial row and is
 *  right for six races but says Piercings for humans and dwarves, who have
 *  beards. Eight races have not changed since 2004, so they are written out.
 *
 *  A tauren's two rows are swapped against every other race, and the geometry
 *  is what says so rather than the labels: what `CharHairGeosets` offers a
 *  tauren is 26 to 42 triangles sitting on top of the skull, and what
 *  `CharacterFacialHairStyles` offers is an 88-triangle piece hanging from the
 *  shoulders to the crown. The first is a pair of horns. The second is a mane. */
export const ROW_LABELS: Record<number, { hair: string; facial: string }> = {
  1: { hair: "Hair", facial: "Facial hair" },
  2: { hair: "Hair", facial: "Piercings" },
  3: { hair: "Hair", facial: "Facial hair" },
  4: { hair: "Hair", facial: "Markings" },
  5: { hair: "Hair", facial: "Features" },
  6: { hair: "Horns", facial: "Hair" },
  7: { hair: "Hair", facial: "Earrings" },
  8: { hair: "Hair", facial: "Tusks" },
};

/* ---------- geosets ---------- */

/** Geoset families, keyed by the hundreds part of the id: the file names its
 *  submeshes `family * 100 + variant`. Family 0 is the body itself (variant 0)
 *  and the hair styles (variants 1 up). */
export const GEOSET_FAMILY: Record<number, string> = {
  0: "body and hair",
  1: "beard",
  2: "moustache",
  3: "sideburns",
  4: "gloves",
  5: "boots",
  6: "shirt hem",
  7: "ears",
  8: "sleeves",
  9: "leg cuffs",
  10: "doublet",
  11: "pants",
  12: "tabard",
  13: "robe skirt",
  14: "loincloth",
  15: "cloak",
  16: "eye glow",
  17: "belt",
  18: "tail",
};

export function familyOf(geoset: number): number {
  return Math.floor(geoset / 100);
}

/** Families that always draw something, even with nothing equipped: variant 1
 *  is the bare version. The bare lower leg is 501 and the bare hand is 401 —
 *  the body chunk stops at the thigh and the wrist, so leaving these off
 *  leaves the character with a gap where their shins should be. A cloth glove
 *  that only repaints the hand keeps variant 1 too, which is why the rule is
 *  uniform rather than a list of exceptions. */
const BARE_FAMILIES = [4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18];

/** Ears are the one family whose default is variant 2, not 1: 701 is the
 *  earless stub a helmet swaps in, and a night elf or troll does not even
 *  carry it — their files hold 702 alone. No item picks ear variants, so the
 *  family sits outside the bare-variant rule rather than as an exception
 *  inside it. */
const EAR_FAMILY = 7;

/** Which families an item in this slot controls, in the order its three
 *  `geosetGroups` values apply. Each one needs checking against the model on
 *  screen — a wrong family reads as a missing sleeve, not as an error. */
export const SLOT_FAMILIES: Record<string, number[]> = {
  chest: [8, 10, 13],
  // A shirt drives the same sleeve and doublet families a chest piece does.
  // Nearly all of them read 0/0/0, which leaves the bare variant showing and
  // only repaints it, so the shared table costs nothing.
  shirt: [8, 10, 13],
  legs: [11, 9, 13],
  feet: [5],
  hands: [4],
  back: [15],
  tabard: [12],
  waist: [17],
  // Bracers are paint alone: the forearm rectangle and no geometry at all.
  wrist: [],
};

export type Worn = { slot: string; geosetGroups: number[]; hides?: string[] };

/** The group a helm can take off a character, by the name the build script
 *  writes into the manifest. */
const HIDE_FAMILY: Record<string, number> = { hair: 0, beard: 1, moustache: 2, sideburns: 3, ears: 7 };

/** What the worn gear takes off the character, by family, and which slot is
 *  responsible. A helm that hides hair hides every hair style rather than one
 *  of them, so this is keyed by family, not geoset. */
export function hiddenGroups(items: Worn[]): Map<number, { slot: string; group: string }> {
  const hidden = new Map<number, { slot: string; group: string }>();
  for (const item of items)
    for (const group of item.hides ?? []) {
      const family = HIDE_FAMILY[group];
      if (family !== undefined && !hidden.has(family)) hidden.set(family, { slot: item.slot, group });
    }
  return hidden;
}

/** The geosets to draw for a character in this look wearing these items.
 *  One variant wins per family: the bare one, unless an item names another.
 *  An item's `geosetGroups` value is one less than the variant it selects, so
 *  a value of 0 means "leave the bare version showing and only repaint it" —
 *  which is what a cloth glove or a plain shirt does.
 *
 *  `hairGeoset` is the mesh id from CharHairGeosets, not the style index —
 *  style 1 is geoset 2 for a human male, and drawing the index gives a
 *  different haircut than the texture was painted for. `facialHair` is the
 *  three variants for beard, moustache and sideburns, each 0 for none. */
export function visibleGeosets(opts: {
  hairGeoset: number;
  facialHair?: number[];
  items: Worn[];
}): Set<number> {
  const variants = new Map<number, number>();
  for (const family of BARE_FAMILIES) variants.set(family, 1);
  variants.set(EAR_FAMILY, 2);
  for (const item of opts.items) {
    const families = SLOT_FAMILIES[item.slot];
    if (!families) continue;
    families.forEach((family, i) => {
      variants.set(family, (item.geosetGroups[i] ?? 0) + 1);
    });
  }

  const on = new Set<number>([0]);
  if (opts.hairGeoset > 0) on.add(opts.hairGeoset);
  (opts.facialHair ?? []).forEach((variant, i) => {
    if (variant > 0) on.add((i + 1) * 100 + variant);
  });
  for (const [family, variant] of variants) on.add(family * 100 + variant);

  // A helm removes whole groups. Family 0 covers the body and the hair, so
  // hiding hair means dropping the hair geoset and keeping the body.
  const hidden = hiddenGroups(opts.items);
  for (const geoset of [...on])
    if (geoset !== 0 && hidden.has(familyOf(geoset))) on.delete(geoset);
  return on;
}

/* ---------- body texture ---------- */

/** One overlay and where it goes. `urls` is a list of candidates rather than
 *  one file because item art is gendered and which of `_M`, `_F`, `_U` or no
 *  suffix at all the client ships varies file by file. The first that loads
 *  wins, so the list is ordered gendered, unisex, bare. */
export type BodyLayer = { region: Region; urls: string[] };

/** Paint the base skin, then every layer in turn, into one 256×256 canvas.
 *  That canvas is the body texture — the thing a chest piece actually is. */
export async function composeBody(baseUrl: string, layers: BodyLayer[]): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.drawImage(await loadImage(baseUrl), 0, 0, 256, 256);
  for (const layer of layers) {
    const r = BODY_REGIONS[layer.region];
    if (!r) continue;
    const image = await firstImage(layer.urls);
    /* A layer the client does not ship is not an error. Skip it. */
    if (image) g.drawImage(image, r.x, r.y, r.w, r.h);
  }
  return canvas;
}

/** The first of these that loads, or null if none of them do. */
export async function firstImage(urls: string[]): Promise<HTMLImageElement | null> {
  for (const url of urls) {
    try {
      return await loadImage(url);
    } catch {
      /* Try the next suffix. */
    }
  }
  return null;
}

/** Decoded overlays, kept for the life of the page.
 *
 *  Recomposing the skin touches a dozen or two of these, and doing it on every
 *  change of gear meant a dozen decodes each time — the browser had the bytes
 *  cached and was decoding them again anyway. An `HTMLImageElement` can be
 *  drawn any number of times, so one per URL is enough for everyone. */
const decoded = new Map<string, Promise<HTMLImageElement>>();

/** `crossOrigin` is not optional here. Every one of these is drawn into the
 *  canvas that becomes the body texture, and a cross-origin image fetched
 *  without it taints that canvas — WebGL then refuses the upload and the
 *  armour vanishes with no error worth reading. It costs nothing same-origin,
 *  so it is set unconditionally rather than guessed at from the URL. */
function loadImage(url: string): Promise<HTMLImageElement> {
  const hit = decoded.get(url);
  if (hit) return hit;
  const load = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${url}`));
    img.src = url;
  });
  decoded.set(url, load);
  // A miss is a real answer worth keeping — the suffix candidates mean some
  // of these are meant to fail — but a network blip should not poison the
  // entry for the rest of the session.
  load.catch(() => decoded.delete(url));
  return load;
}
