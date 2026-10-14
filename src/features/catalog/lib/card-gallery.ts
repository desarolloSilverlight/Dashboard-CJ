import type { CjProductDetail } from "@/core/products/types";
import {
  formatWeightGrams,
  parseCjStringList,
} from "@/features/product/lib/parse-cj-fields";
import { getOptionAxisNames } from "@/features/product/lib/variant-selection";

const MAX_CARD_IMAGES = 6;

export type CardGallery = {
  pid: string;
  images: string[];
  suggestSellPrice: string | null;
  variantSellMin: number | null;
  variantSellMax: number | null;
  variantSuggestMin: number | null;
  variantSuggestMax: number | null;
  variantCount: number;
  weightLabel: string | null;
  freeShipping: boolean;
  options: string | null;
  material: string | null;
};

function pushImages(urls: string[], value: unknown) {
  for (const url of parseCjStringList(value)) {
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean) || urls.includes(clean)) continue;
    urls.push(clean);
    if (urls.length >= MAX_CARD_IMAGES) return;
  }
}

function weightLabel(value: unknown): string | null {
  if (value == null || value === "") return null;
  const single = formatWeightGrams(value);
  if (single && /\d\s*(g|kg)\b/i.test(single)) return single;
  const nums = String(value)
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums?.length) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(2)} kg` : `${Number(n.toFixed(2))} g`;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function finitePrices(values: Array<number | undefined>): number[] {
  return values.filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0);
}

/** Recorte del product/query para la card: fotos y datos de vitrina, sin HTML. */
export function toCardGallery(detail: CjProductDetail, fallbackPid?: string): CardGallery {
  const images: string[] = [];
  pushImages(images, detail.bigImage);
  pushImages(images, detail.productImageSet);
  for (const variant of detail.variants ?? []) {
    if (images.length >= MAX_CARD_IMAGES) break;
    pushImages(images, variant.variantImage);
  }

  const sells = finitePrices((detail.variants ?? []).map((v) => v.variantSellPrice));
  const suggests = finitePrices(
    (detail.variants ?? []).map((v) => v.variantSugSellPrice),
  );
  const axes = getOptionAxisNames(detail.productKeyEn);
  const options =
    detail.productKeyEn?.trim() && axes[0] !== "Variante" ? axes.join(" · ") : null;
  const materials = parseCjStringList(
    detail.materialNameEnSet ?? detail.materialNameEn,
  );
  const material = materials.find((name) => name.length > 0 && name.length <= 42) ?? null;
  const optionText = options && /[a-zA-Z]/.test(options) ? options : null;

  const record = detail as CjProductDetail & { id?: string };

  return {
    pid: record.pid || record.id || fallbackPid || "",
    images,
    suggestSellPrice: detail.suggestSellPrice?.trim() || null,
    variantSellMin: sells.length ? Math.min(...sells) : null,
    variantSellMax: sells.length ? Math.max(...sells) : null,
    variantSuggestMin: suggests.length ? Math.min(...suggests) : null,
    variantSuggestMax: suggests.length ? Math.max(...suggests) : null,
    variantCount: detail.variants?.length ?? 0,
    weightLabel: weightLabel(detail.productWeight),
    freeShipping: detail.addMarkStatus === 1,
    options: optionText,
    material,
  };
}
