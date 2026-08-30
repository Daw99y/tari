import { Baloo_2, Nunito } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

/* THE FACES, LOADED ONCE FOR THE WHOLE PRODUCT.
 *
 * They used to live in app/(site)/layout.tsx, because typography was a
 * landing-page decision and the app had not made one. The landing made it,
 * and then the app looked like a different company's product — so the two
 * faces come up here and both surfaces read them (docs/DESIGN.md, "Type").
 *
 * What did NOT move up is the system stack. It is still in globals.css as
 * --app-sans and it is still what dense data is set in: a 75-row rail and a
 * nineteen-slot paperdoll are read, not spoken, and a round face at 0.8rem
 * is soup. Baloo names things. Nunito says sentences. The system stack does
 * the reading. */

const display = Baloo_2({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--display-round",
  display: "swap",
});

const body = Nunito({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--body-round",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tari",
  description: "A companion for WoW Classic. Every zone is a room.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
