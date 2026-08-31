/* /campfire — the letter waiting when you get home, and the paper it is
   written on. docs/TARI.md §5. It was "the path" at /path until 2026-08-31:
   a path is somewhere you are going, and this is somewhere you sit down. */

import type { Metadata } from "next";

import Campfire from "./Campfire";

export const metadata: Metadata = {
  title: "Campfire · Tari",
};

export default function CampfirePage() {
  return <Campfire />;
}
