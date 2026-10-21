import "server-only";

const TTL_MS = 6 * 60 * 60 * 1000;

const CACHE_PATHS = new Set([
  "/product/query",
  "/product/stock/queryByPid",
  "/logistic/freightCalculate",
  "/logistic/freightCalculateTip",
]);

type Entry = { at: number; status: number; body: unknown };

const store = new Map<string, Entry>();

export function cjCacheKey(
  path: string,
  init: { method?: string; query?: unknown; body?: unknown },
): string | null {
  if (!CACHE_PATHS.has(path)) return null;
  return JSON.stringify({
    path,
    method: (init.method ?? "GET").toUpperCase(),
    query: init.query ?? null,
    body: init.body ?? null,
  });
}

export function readCjCache(key: string): Entry | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return hit;
}

export function writeCjCache(key: string, status: number, body: unknown) {
  const code = (body as { code?: number } | null)?.code;
  if (status !== 200 || code !== 200) return;
  store.set(key, { at: Date.now(), status, body });
}
