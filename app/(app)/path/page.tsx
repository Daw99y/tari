/* /path — the letter, and the paper it is written on. docs/TARI.md §5. */

import type { Metadata } from "next";

import Path from "./Path";

export const metadata: Metadata = {
  title: "The path · Tari",
};

export default function PathPage() {
  return <Path />;
}
