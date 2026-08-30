import type { PinClass } from "./pins";
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

/**
 * A pin's author, in colour. Tari is not a class and takes the accent — the
 * app speaking in its own name, in the one colour that belongs to the app
 * rather than to the game. Every surface that names a pin's author goes
 * through here, so "tari" can never fall through as an undefined lookup.
 */
export function authorColor(cls: PinClass): string {
  return cls === "tari" ? "var(--accent)" : CLASS_COLOR[cls];
}
