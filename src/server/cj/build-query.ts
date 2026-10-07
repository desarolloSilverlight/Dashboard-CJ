export function buildSearchParams(
  query: Record<string, string | string[] | unknown> | undefined,
): URLSearchParams {
  const sp = new URLSearchParams();
  if (!query) return sp;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) sp.append(key, String(item));
    } else {
      sp.set(key, String(value));
    }
  }
  return sp;
}
