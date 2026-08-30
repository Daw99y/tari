"use server";

/* THE DOOR, FROM INSIDE THE SHELL.
 *
 * The landing page opens Discord from a server component and can write its
 * action inline. The rail cannot: it is the client half of the shell, so the
 * action has to live in a file of its own and be imported.
 *
 * It sends the reader back to the row they were standing on. lib/auth.ts is
 * the argument for why this grants nothing — signing in moves the record
 * between machines and changes no feature. */

import { signIn } from "@/lib/auth";

export async function enterWithDiscord(form: FormData): Promise<void> {
  const back = String(form.get("back") ?? "");
  /* Their own path, or the sheet. A value that is not a path on this site is
     a value we did not write, so it does not get to choose the redirect. */
  await signIn("discord", { redirectTo: back.startsWith("/") ? back : "/you" });
}
