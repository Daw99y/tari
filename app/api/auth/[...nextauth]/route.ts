/**
 * Auth.js's own endpoints — sign in, callback, sign out, session.
 *
 * The configuration lives in lib/auth.ts, which is what everything else
 * imports. What is here is the one thing that file cannot do: refuse politely.
 *
 * WITHOUT CREDENTIALS THIS IS A 404, NOT A 500. Auth.js throws when it has no
 * secret, and an unconfigured deploy would answer every `/api/auth/session`
 * call — which the client library makes on page load — with a server error.
 * The site works without a door; it should not log a stack trace on every
 * visit to say so. Same posture as app/api/feedback and app/api/say: no
 * configuration means no feature, quietly.
 */

import { GET as authGet, POST as authPost, hasAuth } from "../../../../lib/auth";

const closed = () =>
  new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export const GET = (...args: Parameters<typeof authGet>) =>
  hasAuth() ? authGet(...args) : closed();

export const POST = (...args: Parameters<typeof authPost>) =>
  hasAuth() ? authPost(...args) : closed();
