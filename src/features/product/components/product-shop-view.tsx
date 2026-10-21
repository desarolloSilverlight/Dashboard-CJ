"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CjProductDetail, CjVariant } from "@/core/products/types";
import { createProductRepository } from "@/infrastructure/products/create-product-repository";
import {
  formatUsd,
  formatWeightGrams,
  parseCjStringList,
} from "../lib/parse-cj-fields";
import {
  findVariantByParts,
  getOptionAxisNames,
  getUniqueOptionValues,
  initialSelectedParts,
  splitVariantKey,
} from "../lib/variant-selection";
import { readBrowserCache, writeBrowserCache } from "@/features/catalog/lib/browser-cache";
import { CopAmount } from "@/features/fx/cop-amount";
import { ColombiaFreightQuote } from "./colombia-freight-quote";
import { ProductInventorySection } from "./product-inventory-section";

type Props = { pid: string };

const productRepo = createProductRepository();

export function ProductShopView({ pid }: Props) {
  const [detail, setDetail] = useState<CjProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [descImage, setDescImage] = useState(0);
  const fetchGen = useRef(0);

  useEffect(() => {
    const gen = ++fetchGen.current;
    let cancelled = false;
    const cached = readBrowserCache<CjProductDetail>(`gazu:detail:${pid}`);
    if (cached?.pid) {
      setDetail(cached);
      setSelectedParts(initialSelectedParts(cached.variants ?? []));
      setLoading(false);
      setError(null);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const res = await productRepo.getProductDetail(pid);
        if (cancelled || gen !== fetchGen.current) return;
        if (res.code !== 200 || !res.data) {
          throw new Error(res.message ?? "Producto no encontrado");
        }
        const data = res.data as CjProductDetail;
        writeBrowserCache(`gazu:detail:${data.pid || pid}`, data);
        setDetail(data);
        setSelectedParts(initialSelectedParts(data.variants ?? []));
      } catch (e) {
        if (!cancelled && gen === fetchGen.current) {
          setError(e instanceof Error ? e.message : "Error");
        }
      } finally {
        if (!cancelled && gen === fetchGen.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pid]);

  const variants = detail?.variants ?? [];
  const axisNames = getOptionAxisNames(detail?.productKeyEn);

  const selectedVariant = useMemo(
    () => findVariantByParts(variants, selectedParts) ?? variants[0],
    [variants, selectedParts],
  );

  const gallery = useMemo(() => {
    const urls: string[] = [];
    const add = (u?: string) => {
      if (u && !urls.includes(u)) urls.push(u);
    };
    if (selectedVariant?.variantImage) add(selectedVariant.variantImage);
    add(detail?.bigImage);
    for (const u of parseCjStringList(detail?.productImageSet)) add(u);
    for (const v of variants) add(v.variantImage);
    return urls;
  }, [detail, selectedVariant, variants]);

  useEffect(() => {
    setActiveImage(0);
  }, [selectedVariant?.vid]);

  const materials = parseCjStringList(
    detail?.materialNameEnSet ?? detail?.materialNameEn,
  );
  const packing = parseCjStringList(detail?.packingNameEnSet);
  const logistics = parseCjStringList(detail?.productProEnSet);

  const sellUsd = asUsd(selectedVariant?.variantSellPrice ?? detail?.sellPrice);
  const displayPrice =
    formatUsd(selectedVariant?.variantSellPrice) ??
    formatUsd(detail?.sellPrice) ??
    "—";

  const suggestVariant = formatUsd(selectedVariant?.variantSugSellPrice);
  const totalStock = useMemo(
    () => sumInventories(selectedVariant),
    [selectedVariant],
  );

  if (loading) return <ProductDetailSkeleton />;

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-[var(--color-cj-coral)]">{error ?? "Sin datos"}</p>
        <Link href="/" className="mt-4 inline-block text-[var(--color-cj-navy)] hover:underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const mainImage = gallery[activeImage];
  const freeShipping = detail.addMarkStatus === 1;
  const description = detail.description
    ? splitDescriptionImages(detail.description)
    : { textHtml: "", images: [] as string[] };

  return (
    <div className="mx-auto max-w-[1280px] px-3 pb-24 pt-2 sm:px-4">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-cj-muted)] transition hover:text-[var(--color-cj-text)]"
      >
        ← Volver al catálogo
      </Link>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-3 lg:sticky lg:top-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-bg)] p-4">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainImage}
                alt={detail.productNameEn ?? ""}
                className="h-full w-full object-contain transition duration-300"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--color-cj-faint)]">
                Sin imagen
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-[var(--color-cj-bg)] transition ${
                    i === activeImage
                      ? "border-[var(--color-cj-lime)] ring-2 ring-[var(--color-cj-lime)]"
                      : "border-[var(--color-cj-border)] opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            {detail.categoryName && (
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-cj-navy)]">
                {detail.categoryName.replace(/,/g, " · ")}
              </p>
            )}
            <h1 className="mt-2 text-xl font-semibold leading-tight text-[var(--color-cj-text)] sm:text-3xl">
              {detail.productNameEn}
            </h1>
            <p className="mt-2 font-mono text-xs text-[var(--color-cj-faint)]">
              SPU {detail.productSku} · ID {detail.pid}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {freeShipping && <Badge tone="emerald">Envío gratis</Badge>}
              {detail.listedNum != null && (
                <Badge tone="slate">{detail.listedNum} listados en CJ</Badge>
              )}
              {detail.productType && (
                <Badge tone="slate">{String(detail.productType)}</Badge>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-5">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-4xl font-bold tabular-nums text-[var(--color-cj-price)]">
                ${displayPrice}
              </span>
              {detail.suggestSellPrice && (
                <span className="pb-1 text-sm text-[var(--color-cj-muted)]">
                  Retail sugerido: {detail.suggestSellPrice}
                </span>
              )}
            </div>
            <CopAmount usd={sellUsd} />
            {suggestVariant && (
              <p className="mt-1 text-xs text-[var(--color-cj-muted)]">
                Sugerido variante: ${suggestVariant}
              </p>
            )}
            {totalStock != null && (
              <p className="mt-3 text-sm text-[var(--color-cj-muted)]">
                Stock total (variante):{" "}
                <span className="font-medium text-[var(--color-cj-text)]">{totalStock}</span>
              </p>
            )}
          </div>

          {variants.length > 0 && (
            <div className="space-y-5 rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-cj-text)]">Opciones</h2>
              {axisNames.map((axisName, axisIndex) => {
                const values = getUniqueOptionValues(variants, axisIndex);
                if (!values.length) return null;
                return (
                  <div key={axisName}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-cj-muted)]">
                      {axisName}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {values.map((val) => {
                        const active = selectedParts[axisIndex] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setSelectedParts((prev) => {
                                const next = [...prev];
                                while (next.length <= axisIndex) next.push("");
                                next[axisIndex] = val;
                                return next;
                              });
                            }}
                            className={`min-w-[3rem] rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                              active
                                ? "border-[#171A20] bg-[var(--color-cj-lime)] text-[#171A20]"
                                : "border-[var(--color-cj-border)] bg-[var(--color-cj-chip)] text-[var(--color-cj-text)] hover:border-[var(--color-cj-carbon)]"
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedVariant && (
            <VariantFacts variant={selectedVariant} product={detail} />
          )}

          <SpecsGrid
            items={[
              ["Peso producto", formatWeightGrams(detail.productWeight)],
              ["Peso empaque", formatWeightGrams(detail.packingWeight)],
              ["Unidad", detail.productUnit ?? null],
              ["Arancel (HS)", detail.entryCode ?? null],
              ["Aduana", detail.entryNameEn ?? null],
              ["Proveedor", detail.supplierName || detail.supplierId || null],
              ["Materiales", materials.join(", ") || null],
              ["Empaque", packing.join(", ") || null],
              ["Logística", logistics.join(", ") || null],
            ]}
          />
        </div>
      </div>

      <ProductInventorySection product={detail} />

      <ColombiaFreightQuote product={detail} variant={selectedVariant} />

      {detail.description && (
        <section className="mt-14 border-t border-[var(--color-cj-border)] pt-10">
          <h2 className="mb-6 text-xl font-semibold">Descripción</h2>
          {description.images.length > 0 && (
            <ImageCarousel
              images={description.images}
              index={descImage}
              onIndex={setDescImage}
            />
          )}
          {description.textHtml.trim() && (
            <div
              className="product-description mt-4 rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-6 text-sm leading-relaxed text-[var(--color-cj-text)]"
              dangerouslySetInnerHTML={{ __html: description.textHtml }}
            />
          )}
        </section>
      )}

      {variants.length > 1 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Todas las variantes</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-cj-border)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--color-cj-chip)] text-xs uppercase text-[var(--color-cj-muted)]">
                <tr>
                  <th className="p-3">Opción</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Stock</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr
                    key={v.vid ?? v.variantSku}
                    className={`cursor-pointer border-t border-[var(--color-cj-border)] hover:bg-[var(--color-cj-chip)] ${
                      v.vid === selectedVariant?.vid ? "bg-[var(--color-cj-lime)]/35" : ""
                    }`}
                    onClick={() =>
                      setSelectedParts(splitVariantKey(v.variantKey))
                    }
                  >
                    <td className="p-3">{v.variantKey ?? v.variantNameEn}</td>
                    <td className="p-3 font-mono text-xs">{v.variantSku}</td>
                    <td className="p-3 tabular-nums">
                      ${formatUsd(v.variantSellPrice) ?? "—"}
                    </td>
                    <td className="p-3">{sumInventories(v) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <BackToTop />
    </div>
  );
}

function ImageCarousel({
  images,
  index,
  onIndex,
}: {
  images: string[];
  index: number;
  onIndex: (index: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const safe = images.length ? index % images.length : 0;
  const src = images[safe];

  useEffect(() => {
    if (paused || images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      onIndex((safe + 1) % images.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [paused, images.length, safe, onIndex]);

  function show(next: number) {
    onIndex((next + images.length) % images.length);
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-[4/3] bg-[var(--color-cj-bg)] sm:aspect-[16/10]">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-contain p-3 sm:p-4" />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-cj-border)] px-3 py-2">
        <button
          type="button"
          className="min-h-11 rounded-lg bg-[var(--color-cj-chip)] px-4 text-xs font-semibold text-[var(--color-cj-text)]"
          onClick={() => show(safe - 1)}
        >
          Anterior
        </button>
        <span className="text-xs tabular-nums text-[var(--color-cj-muted)]">
          {safe + 1} / {images.length}
          {paused ? "" : " · auto"}
        </span>
        <button
          type="button"
          className="min-h-11 rounded-lg bg-[var(--color-cj-lime)] px-4 text-xs font-semibold text-[#171A20]"
          onClick={() => show(safe + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-4 right-4 z-40 rounded-full bg-[var(--color-cj-lime)] px-4 py-3 text-sm font-semibold text-[#171A20] shadow-lg sm:bottom-6 sm:right-6"
    >
      ↑ Arriba
    </button>
  );
}

function splitDescriptionImages(html: string): { textHtml: string; images: string[] } {
  const images: string[] = [];
  const textHtml = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
    if (src && /^https?:\/\//i.test(src) && !images.includes(src)) images.push(src);
    return "";
  });
  return { textHtml, images };
}

function VariantFacts({
  variant,
  product,
}: {
  variant: CjVariant;
  product: CjProductDetail;
}) {
  const dims =
    variant.variantLength && variant.variantWidth && variant.variantHeight
      ? `${variant.variantLength}×${variant.variantWidth}×${variant.variantHeight} mm`
      : null;

  return (
    <div className="rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-chip)] p-4 text-sm">
      <p className="font-medium text-[var(--color-cj-text)]">
        {variant.variantNameEn ?? variant.variantKey}
      </p>
      <dl className="mt-3 grid gap-2 text-xs text-[var(--color-cj-text)] sm:grid-cols-2">
        <div>
          <dt className="text-[var(--color-cj-faint)]">SKU variante</dt>
          <dd className="font-mono text-[var(--color-cj-text)]">{variant.variantSku}</dd>
        </div>
        {variant.barcode && (
          <div>
            <dt className="text-[var(--color-cj-faint)]">Barcode</dt>
            <dd className="font-mono">{variant.barcode}</dd>
          </div>
        )}
        {dims && (
          <div>
            <dt className="text-[var(--color-cj-faint)]">Dimensiones</dt>
            <dd>{dims}</dd>
          </div>
        )}
        {variant.variantWeight != null && (
          <div>
            <dt className="text-[var(--color-cj-faint)]">Peso</dt>
            <dd>{formatWeightGrams(variant.variantWeight)}</dd>
          </div>
        )}
      </dl>
      {variant.inventories && variant.inventories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {variant.inventories.map((inv) => (
            <span
              key={inv.countryCode ?? "xx"}
              className="rounded-lg bg-[var(--color-cj-panel)] px-2 py-1 text-[11px] text-[var(--color-cj-text)]"
            >
              {inv.countryCode}: {inv.totalInventory ?? 0}
            </span>
          ))}
        </div>
      )}
      {!variant.inventories?.length && product.productSku && (
        <p className="mt-2 text-xs text-[var(--color-cj-muted)]">
          Inventario no reportado para esta variante en la respuesta.
        </p>
      )}
    </div>
  );
}

function SpecsGrid({ items }: { items: [string, string | null][] }) {
  const visible = items.filter(([, v]) => v);
  if (!visible.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-5">
      <h2 className="mb-4 text-sm font-semibold text-[var(--color-cj-text)]">
        Ficha técnica
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {visible.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-[var(--color-cj-chip)] px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--color-cj-faint)]">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm text-[var(--color-cj-text)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "emerald" | "slate";
}) {
  const cls =
    tone === "emerald"
      ? "bg-[var(--color-cj-lime)] text-[#171A20]"
      : "bg-[var(--color-cj-chip)] text-[var(--color-cj-muted)]";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function asUsd(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sumInventories(v?: CjVariant): number | null {
  if (!v?.inventories?.length) return null;
  let sum = 0;
  for (const i of v.inventories) sum += i.totalInventory ?? 0;
  return sum;
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] animate-pulse px-4 py-8">
      <div className="mb-8 h-4 w-32 rounded bg-[var(--color-cj-chip)]" />
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-[var(--color-cj-chip)]" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-[var(--color-cj-chip)]" />
          <div className="h-4 w-1/2 rounded bg-[var(--color-cj-chip)]" />
          <div className="h-24 rounded-2xl bg-[var(--color-cj-chip)]" />
          <div className="h-40 rounded-2xl bg-[var(--color-cj-chip)]" />
        </div>
      </div>
    </div>
  );
}
