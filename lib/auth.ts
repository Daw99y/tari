/**
 * THE DOOR.
 *
 * Discord, alone. COMMUNITY.md carries the argument: the audience is already
 * there, the feedback loop closes in a forum this project already owns, and one
 * provider on day one means no account-linking to get wrong. Google and
 * Battle.net come later and cheaply, because of the one decision below.
 *
 * WHAT AN ACCOUNT IS. A passport for the record, not an identity. Signing in
 * grants no feature: every count, every plan and every zone answers a stranger
 * exactly as it answers a member. If a feature ever sits behind this file,
 * COMMUNITY.md has been broken.
 *
 * THE ONE EXPENSIVE-TO-REVERSE DECISION. Nothing is keyed on a Discord
 * snowflake. `users` holds an internal id and `(provider, provider_id)` beside
 * it, so a second provider is a row rather than a migration — and so one human
 * arriving through two doors is a form we can write rather than a merge we
 * cannot.
 *
 * The scope is `identify` and nothing else. Not `guilds.join`: Discord renders
 * that as "Join servers for you" on the consent screen, which is a scarier
 * sentence than this deserves at the exact moment a reader is deciding whether
 * to trust the thing. The server invite is a quiet line in the Character tab
 * and joining is the reader's own act.
 */

import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

import { hasDb, query } from "./db";

/** Whether the door exists at all on this deploy. Without the two Discord
    values there is nothing to sign in to, and every surface that offers it
    checks this first rather than rendering a button that cannot work. */
export function hasAuth(): boolean {
  return (
    !!process.env.AUTH_DISCORD_ID &&
    !!process.env.AUTH_DISCORD_SECRET &&
    !!process.env.AUTH_SECRET &&
    hasDb()
  );
}

/**
 * The internal id for a provider identity, minted on first sight.
 *
 * `on conflict … do update` rather than `do nothing` so the statement returns
 * the row either way: a plain `do nothing` returns no rows for an existing
 * user, which would mean a second query on every single sign-in.
 */
async function userId(provider: string, providerId: string): Promise<number | null> {
  const rows = await query<{ id: string }>(
    `insert into users (provider, provider_id) values ($1, $2)
     on conflict (provider, provider_id)
       do update set provider_id = excluded.provider_id
     returning id`,
    [provider, providerId]
  );
  return rows?.[0] ? Number(rows[0].id) : null;
}

export const { handlers: { GET, POST }, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
      authorization: { params: { scope: "identify" } },
    }),
  ],
  /* A cookie rather than a session table. The only thing this app needs to know
     between requests is which internal id it is talking to, and that fits in a
     signed token — no round trip, nothing to expire, nothing to clean up. */
  session: { strategy: "jwt" },
  /* Take the callback URL from the request's own host.
   *
   * Without it Auth.js can fall back to the deployment URL — whelpplz-abc123
   * .vercel.app rather than whelpplz.com — and Discord rejects the callback as
   * a mismatch. The failure lands on the very last step of the handshake and
   * says almost nothing, which makes it the most expensive five minutes in
   * this file to debug. */
  trustHost: true,
  callbacks: {
    async jwt({ token, account, profile }) {
      /* Only on the sign-in itself: `account` is present exactly once, and
         minting on every request would be a write per page view. */
      if (account && profile) {
        token.uid = await userId(account.provider, String(profile.id));
        /* Their Discord name, for the sign-in row to greet them by. It is not
           what the community calls them — that is their character, see
           COMMUNITY.md — and nothing but the Character tab ever prints it. */
        token.handle =
          (profile as { username?: string; global_name?: string })
            .global_name ??
          (profile as { username?: string }).username ??
          null;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        uid: typeof token.uid === "number" ? token.uid : null,
        handle: typeof token.handle === "string" ? token.handle : null,
      };
    },
  },
});
