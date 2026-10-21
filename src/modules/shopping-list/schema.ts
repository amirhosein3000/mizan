import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const shoppingItems = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id").notNull(),
  text: text("text").notNull(),
  productId: text("product_id"),
  productName: text("product_name"),
  onlineMedian: integer("online_median"),
  onlineMin: integer("online_min"),
  price: integer("price"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

export const shoppingMeta = sqliteTable("shopping_meta", {
  deviceId: text("device_id").primaryKey(),
  budget: integer("budget"),
});

export const SHOPPING_SQL = [
  `CREATE TABLE IF NOT EXISTS shopping_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    text TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    online_median INTEGER,
    online_min INTEGER,
    price INTEGER,
    done INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS shopping_items_device ON shopping_items (device_id)`,
  `CREATE TABLE IF NOT EXISTS shopping_meta (device_id TEXT PRIMARY KEY, budget INTEGER)`,
];

export type ShoppingItem = typeof shoppingItems.$inferSelect;
