import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** One row per (device, product): the latest look at that product. */
export const history = sqliteTable(
  "history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    category: text("category").notNull(),
    storePrice: integer("store_price"),
    paidPrice: integer("paid_price"),
    onlineMedian: integer("online_median"),
    onlineMin: integer("online_min"),
    verdict: text("verdict"),
    saved: integer("saved", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [uniqueIndex("history_device_product").on(t.deviceId, t.productId)],
);

export type HistoryRow = typeof history.$inferSelect;
