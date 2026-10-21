// SQLite via better-sqlite3 + Drizzle. Tables are created on first use with
// CREATE TABLE IF NOT EXISTS (no migration tooling — hackathon-simple).
// New modules: add their CREATE statements to BOOTSTRAP_SQL and their table to schema.ts.
import "server-only";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

const BOOTSTRAP_SQL = [
  `CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    store_price INTEGER,
    paid_price INTEGER,
    online_median INTEGER,
    online_min INTEGER,
    verdict TEXT,
    saved INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS history_device_product ON history (device_id, product_id)`,
];

type DB = BetterSQLite3Database<typeof schema>;
const g = globalThis as unknown as { __choonehDb?: DB };

export function getDb(): DB {
  if (g.__choonehDb) return g.__choonehDb;
  // turbopackIgnore: the DB path is runtime config, not a file to trace into the bundle.
  const file = resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/chooneh.db");
  mkdirSync(dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  for (const stmt of BOOTSTRAP_SQL) sqlite.exec(stmt);
  g.__choonehDb = drizzle(sqlite, { schema });
  return g.__choonehDb;
}

export { schema };
