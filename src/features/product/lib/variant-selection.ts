import type { CjVariant } from "@/core/products/types";

export function getOptionAxisNames(productKeyEn?: string): string[] {
  if (!productKeyEn?.trim()) return ["Variante"];
  const parts = productKeyEn.split("-").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : ["Variante"];
}

export function splitVariantKey(variantKey?: string): string[] {
  if (!variantKey?.trim()) return [];
  return variantKey.split("-").map((s) => s.trim());
}

export function findVariantByParts(
  variants: CjVariant[],
  selectedParts: string[],
): CjVariant | undefined {
  if (!variants.length) return undefined;
  const exact = variants.find((v) => {
    const parts = splitVariantKey(v.variantKey);
    if (parts.length !== selectedParts.length) return false;
    return parts.every((p, i) => p === selectedParts[i]);
  });
  if (exact) return exact;
  return variants.find((v) => {
    const parts = splitVariantKey(v.variantKey);
    return selectedParts.every((sel, i) => !sel || parts[i] === sel);
  });
}

export function initialSelectedParts(variants: CjVariant[]): string[] {
  const first = variants[0];
  const parts = splitVariantKey(first?.variantKey);
  return parts.length ? [...parts] : [];
}

export function getUniqueOptionValues(
  variants: CjVariant[],
  axisIndex: number,
): string[] {
  const set = new Set<string>();
  for (const v of variants) {
    const parts = splitVariantKey(v.variantKey);
    const val = parts[axisIndex];
    if (val) set.add(val);
  }
  return [...set];
}
