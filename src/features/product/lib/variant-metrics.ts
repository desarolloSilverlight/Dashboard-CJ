import type { CjProductDetail, CjVariant } from "@/core/products/types";
import { parseCjStringList } from "./parse-cj-fields";

export function variantWeightGrams(
  variant?: CjVariant,
  product?: CjProductDetail | null,
): number {
  const w =
    variant?.variantWeight ??
    Number(product?.packingWeight) ??
    Number(product?.productWeight);
  return Math.max(1, Math.round(Number(w) || 100));
}

/** Volumen en cm³ para freightCalculateTip */
export function variantVolumeCm3(variant?: CjVariant): number {
  if (variant?.variantVolume && variant.variantVolume > 0) {
    return Math.max(1, Math.round(variant.variantVolume / 1000));
  }
  const l = variant?.variantLength ?? 0;
  const w = variant?.variantWidth ?? 0;
  const h = variant?.variantHeight ?? 0;
  if (l && w && h) {
    return Math.max(1, Math.round((l * w * h) / 1000));
  }
  return 1000;
}

export function originCountryOptions(variant?: CjVariant): string[] {
  const codes = new Set<string>();
  for (const inv of variant?.inventories ?? []) {
    if (inv.countryCode) codes.add(inv.countryCode.toUpperCase());
  }
  if (codes.size === 0) codes.add("CN");
  return [...codes];
}

export function productLogisticsProps(product?: CjProductDetail | null): string[] {
  const props = parseCjStringList(product?.productProEnSet);
  return props.length ? props : ["COMMON"];
}

export function unitPriceUsd(
  variant?: CjVariant,
  product?: CjProductDetail | null,
): number {
  const v = variant?.variantSellPrice ?? product?.sellPrice;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
