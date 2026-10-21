// SQLite via better-sqlite3 + Drizzle. Tables are created on first use with
// CREATE TABLE IF NOT EXISTS (no migration tooling — hackathon-simple).
// Core tables live in BOOTSTRAP_SQL + schema.ts. Feature modules own their tables:
// they define them in src/modules/<id>/schema.ts and call ensureTables() before use.
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
const g = globalThis as unknown as { __tarazooDb?: DB; __tarazooSqlite?: Database.Database; __tarazooTables?: Set<string> };

export function getDb(): DB {
  if (g.__tarazooDb) return g.__tarazooDb;
  // turbopackIgnore: the DB path is runtime config, not a file to trace into the bundle.
  const file = resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/tarazoo.db");
  mkdirSync(dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  for (const stmt of BOOTSTRAP_SQL) sqlite.exec(stmt);
  g.__tarazooSqlite = sqlite;
  g.__tarazooDb = drizzle(sqlite, { schema });
  return g.__tarazooDb;
}

/** Run a module's CREATE ... IF NOT EXISTS statements once per process. */
export function ensureTables(key: string, statements: string[]): DB {
  const db = getDb();
  g.__tarazooTables ??= new Set();
  if (!g.__tarazooTables.has(key)) {
    for (const stmt of statements) g.__tarazooSqlite!.exec(stmt);
    g.__tarazooTables.add(key);
  }
  return db;
}

export { schema };
