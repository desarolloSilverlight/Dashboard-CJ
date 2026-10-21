const TTL_MS = 6 * 60 * 60 * 1000;

type Envelope<T> = { at: number; value: T };

export function readBrowserCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (!parsed || typeof parsed.at !== "number" || Date.now() - parsed.at > TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeBrowserCache(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    /* La sesión se llenó; el servidor sigue teniendo la copia. */
  }
}
