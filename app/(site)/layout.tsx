/* The marketing site. Server components, static. docs/SHELL.md.
 *
 * The seam exists before the chrome does. Header, footer and the refusals
 * land here when the landing page picks its type and colour (STATUS §6.2,
 * §6.4); until then this layout only marks the boundary between the site
 * and the product shell in `(app)/`. It renders no element of its own, so
 * the hero stays full-bleed. */

import type { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
