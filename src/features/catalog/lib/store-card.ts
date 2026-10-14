import { parseCjStringList } from "@/features/product/lib/parse-cj-fields";
import type { CjProductListItem } from "@/core/products/types";
import type { CardGallery } from "./card-gallery";

const NEW_PRODUCT_MS = 30 * 24 * 60 * 60 * 1000;

export type StorePrice = {
  current: string;
  original: string | null;
  percentOff: number | null;
};

function priceNumbers(raw: unknown): number[] {
  if (raw == null || raw === "") return [];
  const matches = String(raw).match(/\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(Number).filter((n) => Number.isFinite(n));
}

function formatAmount(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPriceValue(raw: unknown): string | null {
  const values = priceNumbers(raw);
  if (!values.length) {
    const text = raw == null ? "" : String(raw).trim();
    return text || null;
  }
  if (values.length === 1) return `$${formatAmount(values[0])}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return `$${formatAmount(min)}`;
  return `$${formatAmount(min)} – $${formatAmount(max)}`;
}

function lowestPriceRaw(a?: string, b?: string): string | undefined {
  const an = priceNumbers(a)[0];
  const bn = priceNumbers(b)[0];
  if (an == null) return b ?? a;
  if (bn == null) return a;
  return bn < an ? b : a;
}

export function storePrice(product: CjProductListItem): StorePrice {
  const sellValues = priceNumbers(product.sellPrice);
  const sellMin = sellValues.length ? Math.min(...sellValues) : undefined;
  const dealCandidate = lowestPriceRaw(product.nowPrice, product.discountPrice);
  const dealMin = priceNumbers(dealCandidate)[0];
  const cheaper =
    sellMin != null && dealMin != null && sellMin > dealMin + 0.009;
  const dealRaw = cheaper ? dealCandidate : product.sellPrice ?? dealCandidate;
  const current = formatPriceValue(dealRaw) ?? "—";

  let percentOff: number | null = null;
  if (cheaper && sellMin && dealMin) {
    const rate = Number(product.discountPriceRate);
    if (Number.isFinite(rate) && rate > 0 && rate < 100) {
      percentOff = rate <= 1 ? Math.round(rate * 100) : Math.round(rate);
    }
    if (percentOff == null || percentOff <= 0) {
      percentOff = Math.round((1 - dealMin / sellMin) * 100);
    }
  }
  if (percentOff != null && (percentOff <= 0 || percentOff >= 100)) {
    percentOff = null;
  }

  const original =
    cheaper && product.sellPrice ? formatPriceValue(product.sellPrice) : null;

  return { current, original, percentOff };
}

export function presentCardPrice(
  product: CjProductListItem,
  gallery?: CardGallery | null,
): StorePrice {
  const base = storePrice(product);
  if (!gallery || gallery.variantSellMin == null) return base;

  const sellValues = priceNumbers(product.sellPrice);
  const sellMin = sellValues.length ? Math.min(...sellValues) : undefined;
  const deal = gallery.variantSellMin;
  const spread =
    gallery.variantSellMax != null && gallery.variantSellMax - deal > 0.009;

  if (sellMin != null && deal + 0.009 < sellMin) {
    return storePrice({
      ...product,
      nowPrice: String(deal),
      discountPrice: String(deal),
    });
  }

  if (spread && gallery.variantSellMax != null && !base.current.includes("–")) {
    return {
      current: `$${formatAmount(deal)} – $${formatAmount(gallery.variantSellMax)}`,
      original: base.original,
      percentOff: base.percentOff,
    };
  }

  return base;
}

export function suggestRetailLabel(
  gallery: CardGallery | null | undefined,
  shown: StorePrice,
): string | null {
  if (!gallery) return null;
  const raw =
    gallery.suggestSellPrice ??
    (gallery.variantSuggestMin != null ? String(gallery.variantSuggestMin) : null);
  const suggestMin = priceNumbers(raw)[0] ?? gallery.variantSuggestMin ?? undefined;
  const shownMin = priceNumbers(shown.current)[0];
  if (suggestMin == null || (shownMin != null && suggestMin <= shownMin + 0.05)) {
    return null;
  }
  const label = gallery.suggestSellPrice
    ? formatPriceValue(gallery.suggestSellPrice)
    : gallery.variantSuggestMax != null &&
        gallery.variantSuggestMin != null &&
        gallery.variantSuggestMax - gallery.variantSuggestMin > 0.009
      ? `$${formatAmount(gallery.variantSuggestMin)} – $${formatAmount(gallery.variantSuggestMax)}`
      : formatPriceValue(gallery.variantSuggestMin);
  return label ? `Sugerido ${label}` : null;
}

export function listImages(product: CjProductListItem): string[] {
  const urls: string[] = [];
  const add = (value: unknown) => {
    for (const url of parseCjStringList(value)) {
      const clean = url.trim();
      if (!/^https?:\/\//i.test(clean) || urls.includes(clean)) continue;
      urls.push(clean);
    }
  };

  add(product.bigImage);
  add(product.productImageSet);
  if (typeof product.description === "string") {
    const found = product.description.match(
      /https?:\/\/[^"'\\\s>]+\.(?:jpe?g|png|webp|gif)/gi,
    );
    add(found ?? []);
  }
  return urls.slice(0, 8);
}

export function isNewListing(createAt: unknown): boolean {
  const n = typeof createAt === "number" ? createAt : Number(createAt);
  if (!Number.isFinite(n) || n <= 0) return false;
  const ms = n < 1e12 ? n * 1000 : n;
  return Date.now() - ms < NEW_PRODUCT_MS;
}

export function deliveryLabel(cycle: unknown): string | null {
  if (cycle == null || cycle === "") return null;
  const text = String(cycle).trim();
  if (!text) return null;
  if (/d[ií]a/i.test(text)) return text;
  return `Llega en ${text} días`;
}

export function minOrderLabel(raw: unknown): string | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 1) return null;
  return `Mín. ${n.toLocaleString("es")} uds.`;
}

export function optionLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.length > 80 || text.startsWith("{") || text.startsWith("[")) {
    return null;
  }
  return text.replace(/[|,;/]+/g, " · ");
}
