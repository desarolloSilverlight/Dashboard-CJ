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
  const fetchGen = useRef(0);

  useEffect(() => {
    const gen = ++fetchGen.current;
    let cancelled = false;
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
        <p className="text-red-400">{error ?? "Sin datos"}</p>
        <Link href="/" className="mt-4 inline-block text-blue-400 hover:underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const mainImage = gallery[activeImage];
  const freeShipping = detail.addMarkStatus === 1;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-20 pt-2">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-cj-muted)] transition hover:text-[var(--color-cj-text)]"
      >
        ← Volver al catálogo
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--color-cj-border)] bg-gradient-to-b from-white/[0.04] to-black/40 p-6 shadow-2xl shadow-black/40">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainImage}
                alt={detail.productNameEn ?? ""}
                className="h-full w-full object-contain transition duration-300"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-600">
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
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-black/30 transition ${
                    i === activeImage
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-transparent opacity-70 hover:opacity-100"
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
              <p className="text-xs font-medium uppercase tracking-wider text-blue-400/90">
                {detail.categoryName.replace(/,/g, " · ")}
              </p>
            )}
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-[var(--color-cj-text)] sm:text-3xl">
              {detail.productNameEn}
            </h1>
            <p className="mt-2 font-mono text-xs text-slate-500">
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
              <span className="text-4xl font-bold tabular-nums text-emerald-400">
                ${displayPrice}
              </span>
              {detail.suggestSellPrice && (
                <span className="pb-1 text-sm text-slate-500">
                  Retail sugerido: {detail.suggestSellPrice}
                </span>
              )}
            </div>
            {suggestVariant && (
              <p className="mt-1 text-xs text-slate-500">
                Sugerido variante: ${suggestVariant}
              </p>
            )}
            {totalStock != null && (
              <p className="mt-3 text-sm text-slate-300">
                Stock total (variante):{" "}
                <span className="font-medium text-white">{totalStock}</span>
              </p>
            )}
          </div>

          {variants.length > 0 && (
            <div className="space-y-5 rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-5">
              <h2 className="text-sm font-semibold text-slate-200">Opciones</h2>
              {axisNames.map((axisName, axisIndex) => {
                const values = getUniqueOptionValues(variants, axisIndex);
                if (!values.length) return null;
                return (
                  <div key={axisName}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
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
                            className={`min-w-[3rem] rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                              active
                                ? "border-blue-500 bg-blue-600/25 text-white shadow-lg shadow-blue-900/20"
                                : "border-[var(--color-cj-border)] bg-black/20 text-slate-300 hover:border-slate-500"
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
          <div
            className="product-description rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-6 text-sm leading-relaxed text-slate-300"
            dangerouslySetInnerHTML={{ __html: detail.description }}
          />
        </section>
      )}

      {variants.length > 1 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Todas las variantes</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-cj-border)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--color-cj-panel)] text-xs uppercase text-slate-500">
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
                    className={`cursor-pointer border-t border-[var(--color-cj-border)] hover:bg-white/[0.03] ${
                      v.vid === selectedVariant?.vid ? "bg-blue-500/10" : ""
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
    </div>
  );
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
    <div className="rounded-2xl border border-dashed border-[var(--color-cj-border)] bg-black/20 p-4 text-sm">
      <p className="font-medium text-slate-200">
        {variant.variantNameEn ?? variant.variantKey}
      </p>
      <dl className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div>
          <dt className="text-slate-600">SKU variante</dt>
          <dd className="font-mono text-slate-300">{variant.variantSku}</dd>
        </div>
        {variant.barcode && (
          <div>
            <dt className="text-slate-600">Barcode</dt>
            <dd className="font-mono">{variant.barcode}</dd>
          </div>
        )}
        {dims && (
          <div>
            <dt className="text-slate-600">Dimensiones</dt>
            <dd>{dims}</dd>
          </div>
        )}
        {variant.variantWeight != null && (
          <div>
            <dt className="text-slate-600">Peso</dt>
            <dd>{formatWeightGrams(variant.variantWeight)}</dd>
          </div>
        )}
      </dl>
      {variant.inventories && variant.inventories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {variant.inventories.map((inv) => (
            <span
              key={inv.countryCode ?? "xx"}
              className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-slate-300"
            >
              {inv.countryCode}: {inv.totalInventory ?? 0}
            </span>
          ))}
        </div>
      )}
      {!variant.inventories?.length && product.productSku && (
        <p className="mt-2 text-xs text-slate-600">
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
      <h2 className="mb-4 text-sm font-semibold text-slate-200">
        Ficha técnica
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {visible.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-black/20 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-slate-600">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm text-slate-200">{value}</dd>
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
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-white/5 text-slate-400";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
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
      <div className="mb-8 h-4 w-32 rounded bg-white/10" />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-white/5" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/5" />
          <div className="h-24 rounded-2xl bg-white/5" />
          <div className="h-40 rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
