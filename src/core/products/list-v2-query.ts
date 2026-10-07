import type { ListV2Filters } from "./types";

/** Listado liviano: sin descripción HTML en cada fila. */
export const LIST_V2_LIST_FEATURES = ["enable_category"] as const;

export function buildListV2Query(
  filters: ListV2Filters,
  page: number,
  size: number,
): Record<string, unknown> {
  const q: Record<string, unknown> = {
    page,
    size,
    sort: filters.sort,
    orderBy: filters.orderBy,
    features: [...LIST_V2_LIST_FEATURES],
  };
  if (filters.categoryId) q.categoryId = filters.categoryId;
  if (filters.lv3categoryList?.length) {
    q.lv3categoryList = filters.lv3categoryList;
  }
  if (filters.keyWord) q.keyWord = filters.keyWord;
  if (filters.countryCode) q.countryCode = filters.countryCode;
  return q;
}
