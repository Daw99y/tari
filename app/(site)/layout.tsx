/* The marketing site. Server components, static. docs/SHELL.md.
 *
 * The site's typographic liberty lives here: two round, warm faces for the
 * marketing pages only. Baloo 2 carries the headlines, Nunito the body. The
 * app keeps the system stack (app/layout.tsx has the argument).
 * `display: contents` hands the variables down without adding a box, so the
 * hero stays full-bleed. */

import { Baloo_2, Nunito } from "next/font/google";
import type { ReactNode } from "react";

const display = Baloo_2({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--display-round",
});

const body = Nunito({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--body-round",
});

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable}`} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
