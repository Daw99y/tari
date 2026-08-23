import type { ClassId } from "./types";

/**
 * The class colours, as the game states them — Blizzard's official palette,
 * quoted rather than chosen, the same licence the quality hues take. No
 * consumer at present — the bar's character plate wore these until it took the
 * game's own class icon instead. Kept because the palette is a fact about the
 * game, not a decision this app made. Any UI that takes it up again should mix
 * toward the ink for the light stock (a priest's white and a rogue's yellow
 * vanish on paper); the values themselves stay the game's own.
 */
export const CLASS_COLOR: Record<ClassId, string> = {
  warrior: "#c69b6d",
  paladin: "#f48cba",
  hunter: "#aad372",
  rogue: "#fff468",
  priest: "#ffffff",
  shaman: "#0070dd",
  mage: "#3fc7eb",
  warlock: "#8788ee",
  druid: "#ff7c0a",
};
