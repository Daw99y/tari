/* THE KIT. docs/WELCOME.md §1.
 *
 * Its own route rather than a step inside the creator, because a wizard you
 * get through once is exactly what this is not: a reader can leave at any
 * card and come back to the deck for the rest of the year. The rail links it
 * permanently for the same reason. */

import type { Metadata } from "next";

import { KIT } from "@/lib/kit";

import Kit from "./Kit";

export const metadata: Metadata = { title: "The kit · Tari" };

export default function KitPage() {
  return <Kit cards={KIT} />;
}
