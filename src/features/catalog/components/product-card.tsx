"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { listStockFromListItem } from "@/core/products/stock-merge";
import type { CjProductListItem } from "@/core/products/types";
import type { BogotaQuote } from "../hooks/use-bogota-quotes";
import type { GalleryStatus } from "../hooks/use-card-galleries";
import type { CardGallery } from "../lib/card-gallery";
import { BilingualName } from "./bilingual-name";
import { CopAmount } from "@/features/fx/cop-amount";
import { finalPriceUsd, formatUsd, priceWithShipping } from "../lib/quote-preview";
import {
  deliveryLabel,
  isNewListing,
  listImages,
  minOrderLabel,
  optionLabel,
  presentCardPrice,
  suggestRetailLabel,
  unitPriceUsd,
} from "../lib/store-card";

type Props = {
  product: CjProductListItem;
  gallery?: CardGallery | null;
  galleryState: GalleryStatus;
  selected: boolean;
  benefitPercent: number;
  quote?: BogotaQuote;
  spanish?: string | null;
  translating?: boolean;
  onToggle: (id: string) => void;
  onVisible: (id: string, visible: boolean) => void;
};

export function ProductCard({
  product,
  gallery,
  galleryState,
  selected,
  benefitPercent,
  quote,
  spanish,
  translating = false,
  onToggle,
  onVisible,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [broken, setBroken] = useState(false);
  const price = presentCardPrice(product, galleryState === "ready" ? gallery : null);
  const suggest = suggestRetailLabel(galleryState === "ready" ? gallery : null, price);
  const images =
    galleryState === "ready" && gallery?.images.length
      ? gallery.images
      : listImages(product);
  const stock = listStockFromListItem(product);
  const category =
    product.threeCategoryName ??
    product.twoCategoryName ??
    product.oneCategoryName;
  const freeShipping = product.addMarkStatus === 1 || gallery?.freeShipping === true;
  const hasVideo = product.isVideo === 1;
  const certified = product.hasCECertification === 1;
  const custom = product.customization === 1 || product.isPersonalized === 1;
  const verified = product.verifiedWarehouse === 1;
  const fresh = isNewListing(product.createAt);
  const delivery = deliveryLabel(product.deliveryCycle);
  const minOrder = minOrderLabel(product.directMinOrderNum);
  const listOptions = optionLabel(product.variantKeyEn);
  const readableListOptions =
    listOptions && /[a-zA-Z]/.test(listOptions) ? listOptions : null;
  const detailOptions =
    gallery?.options && /[a-zA-Z]/.test(gallery.options) ? gallery.options : null;
  const options =
    (galleryState === "ready" ? detailOptions : null) ?? readableListOptions;
  const weight = galleryState === "ready" ? displayWeight(gallery?.weightLabel) : null;
  const safeIndex = images.length ? imageIndex % images.length : 0;
  const photo = broken ? undefined : images[safeIndex];
  const canScrub = galleryState === "ready" && images.length > 1;
  const imageKey = images.join("|");

  const stockTone =
    stock.value == null
      ? "unknown"
      : stock.value <= 0
        ? "out"
        : stock.value < 30
          ? "low"
          : "ok";

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => onVisible(product.id, entry.isIntersecting),
      { rootMargin: "280px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible, product.id]);

  useEffect(() => {
    setImageIndex(0);
    setBroken(false);
  }, [imageKey]);

  function scrub(clientX: number, width: number, left: number) {
    if (!canScrub || width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
    const next = Math.min(images.length - 1, Math.floor(ratio * images.length));
    setBroken(false);
    setImageIndex(next);
  }

  const unit = unitPriceUsd(product);
  const shipping = quote?.status === "ready" ? quote.shippingUsd : null;
  const landed = shipping == null ? null : priceWithShipping(unit, shipping);
  const finalPrice = finalPriceUsd(landed, benefitPercent);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-[var(--color-cj-panel)] transition duration-200 hover:-translate-y-1 hover:border-[var(--color-cj-lime)] hover:shadow-lg hover:shadow-black/10 ${
        selected
          ? "border-[var(--color-cj-lime)] ring-2 ring-[var(--color-cj-lime)]"
          : "border-[var(--color-cj-border)]"
      }`}
    >
      <div
        ref={frameRef}
        className="relative aspect-square overflow-hidden bg-[var(--color-cj-bg)]"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          scrub(e.clientX, rect.width, rect.left);
        }}
        onMouseLeave={() => setImageIndex(0)}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={product.nameEn ?? product.sku ?? "Producto"}
            className={`h-full w-full object-contain p-4 transition duration-200 ${
              canScrub ? "" : "group-hover:scale-105"
            } ${stockTone === "out" ? "opacity-40 grayscale" : ""}`}
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-cj-faint)]">
            Sin imagen
          </div>
        )}

        <label className="absolute left-2 top-2 z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white shadow">
          <input
            type="checkbox"
            aria-label={`Seleccionar ${product.nameEn ?? product.sku ?? product.id}`}
            checked={selected}
            onChange={() => onToggle(product.id)}
          />
        </label>

        <div className="pointer-events-none absolute left-11 top-2 flex max-w-[70%] flex-col items-start gap-1.5">
          {price.percentOff != null && (
            <span className="rounded-md bg-[var(--color-cj-coral)] px-2 py-0.5 text-xs font-bold text-white shadow-sm">
              -{price.percentOff}%
            </span>
          )}
          {freeShipping && (
            <span className="rounded-md bg-[#202C49] px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              Envío gratis
            </span>
          )}
          {fresh && (
            <span className="rounded-md bg-[var(--color-cj-lime)] px-2 py-0.5 text-[11px] font-semibold text-[#171A20] shadow-sm">
              Nuevo
            </span>
          )}
        </div>

        <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-1.5">
          {hasVideo && (
            <span className="rounded-full bg-[var(--color-cj-carbon)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-cj-bg)]">
              Video
            </span>
          )}
          {certified && (
            <span className="rounded-full bg-[var(--color-cj-carbon)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-cj-bg)]">
              CE
            </span>
          )}
        </div>

        {stockTone !== "unknown" && (
          <span
            className={`pointer-events-none absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              stockTone === "out"
                ? "bg-[var(--color-cj-coral)] text-white"
                : stockTone === "low"
                  ? "bg-[var(--color-cj-lime)] text-[#171A20]"
                  : "bg-white/90 text-[var(--color-cj-navy)]"
            }`}
          >
            {stockTone === "out"
              ? "Agotado"
              : stockTone === "low"
                ? "Pocas unidades"
                : "En stock"}
          </span>
        )}

        {galleryState === "loading" && (
          <span className="absolute bottom-2 right-2 h-2 w-2 animate-pulse rounded-full bg-white shadow" />
        )}
        {galleryState === "error" && (
          <span
            title="No se pudo cargar la galería"
            className="absolute bottom-2 right-2 h-2 w-2 rounded-full border border-white/70"
          />
        )}
        {galleryState === "ready" && images.length > 0 && (
          <div
            className={`absolute right-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 ${
              canScrub ? "bottom-2 group-hover:bottom-16" : "bottom-2"
            }`}
          >
            {images.map((url, i) => (
              <span
                key={`${url}-${i}`}
                className={`h-1.5 rounded-full transition ${
                  i === safeIndex ? "w-3 bg-white" : "w-1.5 bg-white/45"
                }`}
              />
            ))}
          </div>
        )}

        {canScrub && (
          <div className="absolute inset-x-0 bottom-0 flex gap-1 overflow-x-auto bg-gradient-to-t from-black/55 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
            {images.map((url, i) => (
              <button
                key={`${url}-thumb-${i}`}
                type="button"
                aria-label={`Imagen ${i + 1}`}
                onMouseEnter={() => {
                  setBroken(false);
                  setImageIndex(i);
                }}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 bg-white ${
                  i === safeIndex ? "border-white" : "border-transparent opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {category && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--color-cj-accent)]">
            {category}
          </p>
        )}
        <h3 className="text-sm font-medium leading-snug text-[var(--color-cj-text)]">
          <BilingualName
            english={product.nameEn ?? product.sku ?? "Producto sin nombre"}
            spanish={spanish}
            pending={translating && Boolean(product.nameEn)}
          />
        </h3>

        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-xl font-bold tabular-nums text-[var(--color-cj-price)]">
            {price.current}
          </span>
          {price.original && (
            <span className="pb-0.5 text-sm tabular-nums text-[var(--color-cj-faint)] line-through">
              {price.original}
            </span>
          )}
          <span className="pb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-cj-faint)]">
            USD
          </span>
        </div>
        {suggest && <p className="text-xs text-[var(--color-cj-muted)]">{suggest}</p>}
        <p className="text-xs text-[var(--color-cj-muted)]">
          {!quote || quote.status === "loading"
            ? "Cotizando envío a Bogotá…"
            : quote.status === "ready" && landed != null
              ? `Con envío ${formatUsd(landed)}${quote.carrier ? ` · ${quote.carrier}` : ""}`
              : (quote.message ?? "Sin envío a Bogotá")}
        </p>
        <p className="text-sm font-semibold tabular-nums text-[var(--color-cj-text)]">
          Final {formatUsd(finalPrice)}
          <CopAmount usd={finalPrice} />
        </p>

        <p className="text-xs text-[var(--color-cj-muted)]">
          {stock.value != null ? (
            <>
              {stock.label}:{" "}
              <span className="font-medium text-[var(--color-cj-text)]">
                {stock.value.toLocaleString("es")} uds.
              </span>
            </>
          ) : (
            <span className="text-[var(--color-cj-faint)]">Stock sin dato en el listado</span>
          )}
          {product.listedNum != null && product.listedNum > 0 && (
            <span className="text-[var(--color-cj-faint)]">
              {" "}
              · {product.listedNum.toLocaleString("es")} listados
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {verified && <Chip>Inventario verificado</Chip>}
          {custom && <Chip>Personalizable</Chip>}
          {galleryState === "ready" && gallery && gallery.variantCount > 1 && (
            <Chip>{gallery.variantCount} variantes</Chip>
          )}
          {delivery && <Chip>{delivery}</Chip>}
          {weight && <Chip>{weight}</Chip>}
          {minOrder && <Chip>{minOrder}</Chip>}
          {options && <Chip>{options}</Chip>}
          {gallery?.material && <Chip>{gallery.material}</Chip>}
        </div>

        {(product.sku || product.supplierName) && (
          <p className="mt-auto truncate pt-1 font-mono text-[10px] text-[var(--color-cj-faint)]">
            {product.sku}
            {product.supplierName ? ` · ${product.supplierName}` : ""}
          </p>
        )}

        <Link
          href={`/product/${product.id}`}
          className="mt-1 inline-flex justify-center rounded-lg border border-[var(--color-cj-border)] py-2 text-sm font-semibold text-[var(--color-cj-text)] hover:bg-[var(--color-cj-chip)]"
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}

function displayWeight(label?: string | null): string | null {
  if (!label) return null;
  if (/\d\s*(g|kg)\b/i.test(label)) return label;
  const nums = label.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length || !/[0-9]/.test(label)) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(2)} kg` : `${Number(n.toFixed(2))} g`;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="max-w-full truncate rounded-full bg-[var(--color-cj-chip)] px-2 py-0.5 text-[10px] text-[var(--color-cj-muted)]">
      {children}
    </span>
  );
}
