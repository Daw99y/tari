/**
 * THE WINDOW, ON ITS OWN.
 *
 * Three numbers that decide what counts as "here for you right now", lifted
 * out of lib/loot.ts so that something can read them without reading the loot.
 *
 * That is the whole reason this file exists. `lib/loot.ts` imports
 * `loot-files.ts`, which static-imports all 75 room files and every one of
 * their 2,320 items — the right shape for a room screen, which needs them, and
 * an absurd one for the rail, which needs three integers to count with. A
 * `import { PANEL_CEILING } from "./loot"` on the rail would have shipped a
 * megabyte of item data to every page in the app.
 *
 * Copying the numbers into the rail instead would have been two sources of
 * truth on the day the window moves, and the window is exactly the kind of
 * thing that moves. So they live here and lib/loot.ts re-exports them, which
 * means every existing importer is unchanged and there is still one place the
 * window is written down.
 */

/* The window, as whelp plz drew it: five below, three above. */
export const WINDOW_BELOW = 5;
export const WINDOW_ABOVE = 3;
export const PANEL_CEILING = 8;
