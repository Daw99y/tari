import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

/* No font is chosen here on purpose. Typography is a landing-page decision
 * (docs/TARI.md §11.4), and next/font fetches from Google at build time,
 * which the cloud verification container cannot reach. Pick the face when
 * the landing page picks it. */

export const metadata: Metadata = {
  title: "Tari",
  description: "A companion for WoW Classic. Every zone is a room.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
