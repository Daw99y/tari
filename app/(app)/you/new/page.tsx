/* THE CREATOR. docs/CHARACTER.md: the doorstep, once.
 *
 * A page in the shell, so the rail stays up; the room behind the doll is the
 * race's starting zone. Everything here is the reader's choice, made in the
 * browser, so the page is one client component. */

import type { Metadata } from "next";

import Creator from "./Creator";

export const metadata: Metadata = {
  title: "Who are you · Tari",
};

export default function NewCharacterPage() {
  return <Creator />;
}
