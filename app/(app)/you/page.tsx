/* /you — the character sheet. docs/CHARACTER.md. The path (TARI.md §5)
 * lands on this page later; for now it is the paperdoll. */

import type { Metadata } from "next";

import Sheet from "./Sheet";

export const metadata: Metadata = {
  title: "You · Tari",
};

export default function YouPage() {
  return <Sheet />;
}
