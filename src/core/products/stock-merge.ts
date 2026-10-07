import type { CjProductDetail, CjVariant } from "./types";
import type { ProductStockSnapshot, VariantStockRow } from "./types";

function rowFromVariant(v: CjVariant): VariantStockRow | null {
  if (!v.inventories?.length) return null;
  const byCountry: Record<string, number> = {};
  let total = 0;
  for (const inv of v.inventories) {
    const code = (inv.countryCode ?? "??").toUpperCase();
    const n = inv.totalInventory ?? 0;
    byCountry[code] = (byCountry[code] ?? 0) + n;
    total += n;
  }
  return {
    vid: v.vid,
    variantSku: v.variantSku,
    variantKey: v.variantKey,
    byCountry,
    total,
  };
}

function rowsFromDetail(detail: CjProductDetail): VariantStockRow[] {
  return (detail.variants ?? [])
    .map(rowFromVariant)
    .filter((r): r is VariantStockRow => r != null);
}

/** Parse respuesta flexible de GET /product/stock/queryByPid */
export function rowsFromStockApi(data: unknown): VariantStockRow[] {
  if (!data) return [];
  const list = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null
      ? ((data as { list?: unknown[]; variantInventories?: unknown[] })
          .list ??
        (data as { variantInventories?: unknown[] }).variantInventories ??
        (data as { data?: unknown[] }).data ??
        [])
      : [];

  const rows: VariantStockRow[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const invList =
      (o.inventory as unknown[]) ??
      (o.inventories as unknown[]) ??
      (o.stock as unknown[]) ??
      [];
    const byCountry: Record<string, number> = {};
    let total = 0;
    if (Array.isArray(invList)) {
      for (const inv of invList) {
        if (!inv || typeof inv !== "object") continue;
        const i = inv as Record<string, unknown>;
        const code = String(i.countryCode ?? i.areaEn ?? "??").toUpperCase();
        const n = Number(i.totalInventory ?? i.inventory ?? 0) || 0;
        byCountry[code] = (byCountry[code] ?? 0) + n;
        total += n;
      }
    }
    const directTotal = Number(o.totalInventory ?? o.inventoryNum);
    if (Number.isFinite(directTotal) && directTotal > 0 && total === 0) {
      total = directTotal;
      byCountry.TOTAL = directTotal;
    }
    if (total > 0 || Object.keys(byCountry).length > 0) {
      rows.push({
        vid: o.vid as string | undefined,
        variantSku: (o.variantSku ?? o.sku) as string | undefined,
        variantKey: (o.variantKey ?? o.variantNameEn) as string | undefined,
        byCountry,
        total: total || Object.values(byCountry).reduce((a, b) => a + b, 0),
      });
    }
  }
  return rows;
}

function mergeRows(a: VariantStockRow[], b: VariantStockRow[]): VariantStockRow[] {
  const map = new Map<string, VariantStockRow>();
  const key = (r: VariantStockRow) => r.vid ?? r.variantSku ?? r.variantKey ?? "";
  for (const r of [...a, ...b]) {
    const k = key(r);
    if (!k) continue;
    const prev = map.get(k);
    if (!prev) {
      map.set(k, { ...r, byCountry: { ...r.byCountry } });
      continue;
    }
    for (const [c, n] of Object.entries(r.byCountry)) {
      prev.byCountry[c] = Math.max(prev.byCountry[c] ?? 0, n);
    }
    prev.total = Math.max(prev.total, r.total);
  }
  return [...map.values()].sort((x, y) => y.total - x.total);
}

export function buildStockSnapshot(
  detail: CjProductDetail,
  apiData: unknown | null,
): ProductStockSnapshot {
  const fromDetail = rowsFromDetail(detail);
  const fromApi = apiData ? rowsFromStockApi(apiData) : [];
  const variantRows = mergeRows(fromDetail, fromApi);
  const productTotal =
    detail.warehouseInventoryNum ??
    (variantRows.length
      ? variantRows.reduce((s, r) => s + r.total, 0)
      : undefined);

  return {
    productTotal:
      typeof productTotal === "number" ? productTotal : undefined,
    variantRows,
    source:
      fromDetail.length && fromApi.length
        ? "merged"
        : fromApi.length
          ? "api"
          : "detail",
  };
}

export function listStockFromListItem(product: {
  warehouseInventoryNum?: number;
  totalVerifiedInventory?: number;
  totalUnVerifiedInventory?: number;
}): { label: string; value: number | null } {
  const w = product.warehouseInventoryNum;
  if (w != null && w >= 0) return { label: "Stock bodega", value: w };
  const v = product.totalVerifiedInventory;
  if (v != null && v >= 0) return { label: "Stock verificado", value: v };
  return { label: "Stock", value: null };
}
