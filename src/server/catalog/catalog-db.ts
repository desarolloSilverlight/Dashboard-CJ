import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CjProductListItem } from "@/core/products/types";

export type ImportNode = {
  label: string;
  categoryId?: string;
  lv3categoryList?: string[];
  nextPage: number;
  totalPages: number | null;
  children: ImportNode[];
};

export type ImportRecord = {
  status: "idle" | "running" | "paused" | "done";
  message: string;
  queue: ImportNode[];
};

let db: DatabaseSync | null = null;

function database(): DatabaseSync {
  if (db) return db;
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "catalog.sqlite");
  const opened = new DatabaseSync(file);
  opened.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT,
      name_en TEXT,
      sell_price TEXT,
      big_image TEXT,
      warehouse_inventory_num INTEGER,
      category_id TEXT,
      one_category_name TEXT,
      two_category_name TEXT,
      three_category_name TEXT,
      listed_num INTEGER,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS import_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL
    );
  `);
  db = opened;
  return opened;
}

const EMPTY: ImportRecord = {
  status: "idle",
  message: "El listado todavía no se ha bajado a la base local.",
  queue: [],
};

export function readImportRecord(): ImportRecord {
  const row = database()
    .prepare("SELECT payload FROM import_state WHERE id = 1")
    .get() as { payload: string } | undefined;
  if (!row) return EMPTY;
  try {
    const parsed = JSON.parse(row.payload) as ImportRecord;
    return {
      status: parsed.status ?? "idle",
      message: parsed.message ?? "",
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
    };
  } catch {
    return EMPTY;
  }
}

export function writeImportRecord(record: ImportRecord) {
  database()
    .prepare(
      `INSERT INTO import_state (id, payload) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
    )
    .run(JSON.stringify(record));
}

export function countProducts(): number {
  const row = database().prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number };
  return Number(row?.n) || 0;
}

export function upsertListProducts(items: CjProductListItem[]) {
  if (items.length === 0) return;
  const stmt = database().prepare(`
    INSERT INTO products (
      id, sku, name_en, sell_price, big_image, warehouse_inventory_num,
      category_id, one_category_name, two_category_name, three_category_name,
      listed_num, raw_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sku = excluded.sku,
      name_en = excluded.name_en,
      sell_price = excluded.sell_price,
      big_image = excluded.big_image,
      warehouse_inventory_num = excluded.warehouse_inventory_num,
      category_id = excluded.category_id,
      one_category_name = excluded.one_category_name,
      two_category_name = excluded.two_category_name,
      three_category_name = excluded.three_category_name,
      listed_num = excluded.listed_num,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  database().exec("BEGIN");
  try {
    for (const item of items) {
      if (!item.id) continue;
      stmt.run(
        item.id,
        item.sku ?? null,
        item.nameEn ?? null,
        item.sellPrice ?? null,
        item.bigImage ?? null,
        item.warehouseInventoryNum ?? null,
        item.categoryId ?? null,
        item.oneCategoryName ?? null,
        item.twoCategoryName ?? null,
        item.threeCategoryName ?? null,
        item.listedNum ?? null,
        JSON.stringify(item),
        now,
      );
    }
    database().exec("COMMIT");
  } catch (err) {
    database().exec("ROLLBACK");
    throw err;
  }
}
