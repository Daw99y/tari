/* /lab/doll — the fitting bench.
 *
 * A character from the 1.12 client, wearing gear from the same client, drawn
 * in the browser from the .m2 files and the DBC tables. /lab reads spell
 * visuals on a 2D canvas; a body needs a depth buffer and a light, so this
 * page runs on WebGL. Working surface, not a shipped page. */

import type { Metadata } from "next";

import Doll from "./Doll";

export const metadata: Metadata = {
  title: "Fitting bench · Tari",
  description: "A vanilla character wearing vanilla gear, read from the client.",
  robots: { index: false, follow: false },
};

export default function DollPage() {
  return <Doll />;
}
