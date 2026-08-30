/* Where the curtain's succubus keeps her files, and what they are called.
 *
 * This is the whole reason she is the one who holds the wait: her file list
 * is a constant. The rogue's is not — hers is discovered by fetching a
 * manifest and reading it, which costs a round trip before the first byte of
 * geometry is even asked for. Because these five names are known at build
 * time, the landing page preloads them from the document head and they come
 * down alongside the HTML.
 *
 * Written by scripts/succubus-build.mjs. Kept out of the component so a
 * server component can read the list without pulling a "use client" module
 * across the boundary.
 */

export const SUCCUBUS_BASE = "/lab/succubus";

/** AnimationData ids baked into the model. Stand is the wait; SuccubusEntice
 *  is what the client itself plays when a warlock's pet charms something. */
export const STAND = 0;
export const ENTICE = 194;

/** Her runtime texture slots, keyed by M2 texture type. Types 11, 12 and 13
 *  are TextureVariation 0, 1 and 2 of a CreatureDisplayInfo row, and the
 *  order is the table's, not a guess: display 4162 — the warlock's own pet —
 *  reads SuccubusNewSkin, SuccubusSkinWing, SuccubusHair. Wing before hair.
 *  Guessing it the other way round put her wing leather on her head. */
export const SUCCUBUS_SLOTS: [number, string][] = [
  [11, "skin"],
  [12, "wing"],
  [13, "hair"],
];

/** The one texture the model names for itself, as the path sits in the file. */
export const SUCCUBUS_EYES = "CREATURE\\SUCCUBUS\\SUCCUBUSEYEGLOWBLUEGREEN.BLP";

/** The eye glow's file name, flattened the way `texKey` in m2-gl flattens a
 *  game path. Spelled out rather than computed so this module stays free of
 *  three.js — the landing page imports it on the server. */
const EYES_FILE = "creature_succubus_succubuseyeglowbluegreen.webp";

export const SUCCUBUS_MODEL = `${SUCCUBUS_BASE}/Succubus.tbody`;

/** Every byte she needs, for the page's preload hints. */
export const SUCCUBUS_ASSETS = {
  model: SUCCUBUS_MODEL,
  textures: [...SUCCUBUS_SLOTS.map(([, name]) => `${SUCCUBUS_BASE}/${name}.webp`), `${SUCCUBUS_BASE}/${EYES_FILE}`],
};
