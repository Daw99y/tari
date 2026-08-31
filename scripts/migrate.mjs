/* RUN db/schema.sql AGAINST NEON.
 *
 * There is no psql on a stock Mac and there is no reason to install one: `pg`
 * is already a dependency, it speaks the same wire protocol, and this is nine
 * lines of it. Same shape and the same env loading as scripts/seed-pins.mjs.
 *
 * SAFE TO RUN AS OFTEN AS YOU LIKE. Every statement in db/schema.sql is
 * `create table if not exists`, `create index if not exists` or
 * `alter table ... add column if not exists` — the repo's additive-only rule
 * (docs/STATUS.md §7) is what makes the whole file idempotent, so this is
 * "bring the database up to the file" rather than "apply migration N".
 *
 * IT RUNS AS ONE TRANSACTION. Either the database matches the file afterwards
 * or nothing moved; a half-applied schema is the one state that would be worse
 * than not running it.
 *
 * THE SSL WARNING IT PRINTS IS NOISE, FOR NOW. `pg` warns that `sslmode=require`
 * — which is what Neon's pooled string carries — is currently treated as
 * `verify-full`, and that pg v9 will switch it to the weaker libpq meaning.
 * Today's behaviour is the strict one, so nothing is wrong and nothing needs
 * changing. It becomes real work only when this repo moves to pg v9: at that
 * point the connection string wants `sslmode=verify-full` spelled out, here
 * and in lib/db.ts, or the deploy quietly drops to a weaker check.
 *
 * RUN IT FROM YOUR OWN TERMINAL:  node scripts/migrate.mjs [--dry]
 * The Cowork bridge's VM has no egress to Neon, so it cannot run this.
 */

import { existsSync, readFileSync } from "node:fs";

import pg from "pg";

const dry = process.argv.includes("--dry");

/** Load .env.local the way `next dev` would — a plain node script gets none of
 *  Next's env handling. Same shape as scripts/seed-pins.mjs. */
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
    } catch {
      /* Older node, or a malformed file. The check below reports it. */
    }
    if (process.env.DATABASE_URL) return;
  }
}

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("No DATABASE_URL. `vercel env pull .env.local`, or export it.");
  process.exit(1);
}

const sql = readFileSync("db/schema.sql", "utf8");

/* Only so the summary can say what it did. `pg` sends the file as one string
   and Postgres parses it; this count is for the human, not for the driver. */
const statements = sql
  .split(";")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter(Boolean).length;

if (dry) {
  console.log(`Would run db/schema.sql — ${statements} statements — against`);
  console.log(process.env.DATABASE_URL.replace(/:[^:@/]+@/, ":***@"));
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = await pool.connect();

try {
  await db.query("begin");
  await db.query(sql);
  await db.query("commit");
  console.log(`Schema applied — ${statements} statements, all idempotent.`);

  /* Say what is actually there now, because "it ran" and "the tables exist"
     are different claims and only the second one is useful. */
  const { rows } = await db.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`,
  );
  console.log("Tables:", rows.map((r) => r.table_name).join(", "));

  const { rows: prefs } = await db.query(
    `select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'users' and column_name = 'prefs'`,
  );
  console.log(`users.prefs: ${prefs.length ? "present" : "MISSING"}`);
} catch (e) {
  await db.query("rollback").catch(() => {});
  console.error("Nothing was applied. Postgres said:");
  console.error(e.message);
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
