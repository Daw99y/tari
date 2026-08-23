import { statSync } from "node:fs";
import { join } from "node:path";

/**
 * The real size of the served addon zip, measured at build time.
 *
 * `public/WhelpPlz.zip` is a build copy of `addon/WhelpPlz.zip`, which stays
 * the source of truth; this reads the copy that will actually be served, so
 * the number the download sheet states can only ever describe the file the
 * reader gets. A missing zip is a broken build, not a broken page: the sheet
 * still points at the path and the size simply goes unstated.
 *
 * It lived in app/page.tsx while the landing was the only screen with a
 * download door; the app's footer carries the same sheet now, and two copies
 * of a stat call is how the two doors drift.
 */
export function zipBytes(): number {
  try {
    return statSync(join(process.cwd(), "public", "WhelpPlz.zip")).size;
  } catch {
    return 0;
  }
}
