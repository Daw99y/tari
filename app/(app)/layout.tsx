/* The product. One shell, mounted once (docs/SHELL.md).
 *
 * A server component so the session is read on the server and handed down as
 * a value — the client half of the shell never has to ask who it is talking
 * to. `auth()` needs the Discord pair and AUTH_SECRET to mean anything, so
 * on a deploy without them the shell renders signed out rather than throwing
 * (lib/auth.ts, hasAuth). */

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { auth, hasAuth } from "@/lib/auth";

import Shell from "./Shell";

export const metadata: Metadata = {
  title: "Tari",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = hasAuth() ? await auth() : null;
  const handle = (session as { handle?: string | null } | null)?.handle ?? null;

  return <Shell handle={handle}>{children}</Shell>;
}
