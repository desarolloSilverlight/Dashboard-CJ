export function buildCatalogCacheKey(
  parentKey: string,
  subKey: string,
  keyWord: string,
): string {
  const p = parentKey.trim();
  const s = subKey.trim() || "all";
  const kw = keyWord.trim().toLowerCase();
  return `${p}::${s}::${kw}`;
}
