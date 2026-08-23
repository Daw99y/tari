/**
 * The one connection, and the switch that turns the whole log off.
 *
 * node-postgres rather than Neon's own client, and the reason is that this code
 * can then be run against a real Postgres anywhere. Neon's driver speaks
 * WebSocket to Neon's endpoint and cannot connect to a local server at all,
 * which would make every route in front of it unverifiable outside production.
 * `pg` talks the standard wire protocol, Neon serves it, and the same file runs
 * against a laptop's Postgres and against the deploy.
 *
 * DATABASE_URL MUST BE NEON'S POOLED STRING — the host with `-pooler` in it.
 * Serverless functions open a connection per instance and Neon's own pooler is
 * what keeps that from exhausting the database. The unpooled string works
 * perfectly in development and falls over exactly when the site gets busy,
 * which is the worst possible time to learn the difference.
 */

import { Pool } from "pg";

/** Whether there is anywhere to write. The site runs identically without it —
    see the routes, which say ok and do nothing rather than failing a reader's
    request over a feature they did not ask for. */
export function hasDb(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * One pool per process, parked on globalThis.
 *
 * Not a nicety: a dev server hot-reloads this module on every edit and a fresh
 * pool per reload leaks connections until Postgres refuses new ones. The same
 * shape keeps a warm lambda reusing its pool instead of dialling per request.
 */
const holder = globalThis as unknown as { __whelpPool?: Pool };

function pool(): Pool {
  if (!holder.__whelpPool) {
    holder.__whelpPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    /* An idle client erroring takes the process down if nothing is listening.
       There is nothing useful to do about it beyond not dying. */
    holder.__whelpPool.on("error", (e) => console.error("db: idle client", e));
  }
  return holder.__whelpPool;
}

/** A query, or null if there is no database. Never throws for want of one. */
export async function query<T>(
  text: string,
  params: unknown[] = []
): Promise<T[] | null> {
  if (!hasDb()) return null;
  const res = await pool().query(text, params);
  return res.rows as T[];
}
