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
  // ---- agent: missions (one shopping goal), calls to shops, confirmed stock/price ----
  `CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_title TEXT NOT NULL,
    context TEXT NOT NULL,
    asks TEXT NOT NULL,
    question TEXT,
    reserve TEXT NOT NULL,
    status TEXT NOT NULL,
    chosen_shop_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS missions_device ON missions (device_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    reason TEXT,
    replaces TEXT,
    started_at INTEGER NOT NULL,
    ends_at INTEGER,
    script TEXT,
    result TEXT,
    recorded INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS calls_mission ON calls (mission_id)`,
  `CREATE INDEX IF NOT EXISTS calls_shop ON calls (shop_id, started_at)`,
  `CREATE TABLE IF NOT EXISTS confirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    available INTEGER,
    price INTEGER,
    hold_until INTEGER,
    source TEXT NOT NULL,
    note TEXT,
    call_id TEXT,
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS confirmations_product ON confirmations (product_id, at)`,
  `CREATE INDEX IF NOT EXISTS confirmations_shop ON confirmations (shop_id, at)`,
  `CREATE TABLE IF NOT EXISTS seller_presence (shop_id TEXT PRIMARY KEY, last_seen INTEGER NOT NULL)`,
];

type DB = BetterSQLite3Database<typeof schema>;
const g = globalThis as unknown as { __mizanDb?: DB; __mizanSqlite?: Database.Database; __mizanTables?: Set<string> };

export function getDb(): DB {
  if (g.__mizanDb) return g.__mizanDb;
  // turbopackIgnore: the DB path is runtime config, not a file to trace into the bundle.
  const file = resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/mizan.db");
  mkdirSync(dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  for (const stmt of BOOTSTRAP_SQL) sqlite.exec(stmt);
  g.__mizanSqlite = sqlite;
  g.__mizanDb = drizzle(sqlite, { schema });
  return g.__mizanDb;
}

/** Raw better-sqlite3 handle, for JSON-heavy agent tables where SQL is clearer than an ORM. */
export function getSqlite(): Database.Database {
  getDb();
  return g.__mizanSqlite!;
}

/** Run a module's CREATE ... IF NOT EXISTS statements once per process. */
export function ensureTables(key: string, statements: string[]): DB {
  const db = getDb();
  g.__mizanTables ??= new Set();
  if (!g.__mizanTables.has(key)) {
    for (const stmt of statements) g.__mizanSqlite!.exec(stmt);
    g.__mizanTables.add(key);
  }
  return db;
}

export { schema };
