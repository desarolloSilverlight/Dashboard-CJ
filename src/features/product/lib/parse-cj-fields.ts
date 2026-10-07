/** CJ a veces devuelve arrays como JSON string. */
export function parseCjStringList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map(String).filter((s) => s && s !== '""');
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const parsed = JSON.parse(t) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map(String).filter((s) => s && s !== '""');
        }
      } catch {
        /* fallthrough */
      }
    }
    return [t];
  }
  return [String(value)];
}

export function formatUsd(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(2);
}

export function formatWeightGrams(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n >= 1000) return `${(n / 1000).toFixed(2)} kg`;
  return `${n} g`;
}
