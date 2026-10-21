// Server-only entry point for catalog data. Feature code calls getCatalog() and
// never imports the SQLite implementation directly.
import "server-only";
import { openCatalog } from "./sqlite-catalog";
import type { Catalog } from "./types";

// Module-level (not globalThis) so a code change in dev gets a fresh instance.
let instance: Catalog | null = null;

export function getCatalog(): Catalog {
  instance ??= openCatalog();
  return instance;
}

export * from "./types";
