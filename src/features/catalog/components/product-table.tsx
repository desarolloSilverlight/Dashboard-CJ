import Link from "next/link";
import type { CjProductListItem } from "@/core/products/types";
import type { BogotaQuote } from "../hooks/use-bogota-quotes";
import type { GalleryStatus } from "../hooks/use-card-galleries";
import type { CardGallery } from "../lib/card-gallery";
import { listImages, unitPriceUsd } from "../lib/store-card";
import { BilingualName } from "./bilingual-name";
import { CopAmount } from "@/features/fx/cop-amount";
import { finalPriceUsd, formatUsd, priceWithShipping } from "../lib/quote-preview";

type Props = {
  products: CjProductListItem[];
  selected: Set<string>;
  benefitPercent: number;
  galleries: Record<string, CardGallery>;
  galleryStatus: Record<string, GalleryStatus>;
  quotes: Record<string, BogotaQuote>;
  spanish: Record<string, string>;
  translating: boolean;
  onToggle: (id: string) => void;
  onTogglePage: (ids: string[], selected: boolean) => void;
};

export function ProductTable({
  products,
  selected,
  benefitPercent,
  galleries,
  galleryStatus,
  quotes,
  spanish,
  translating,
  onToggle,
  onTogglePage,
}: Props) {
  const pageIds = products.map((p) => p.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm sm:min-w-[1080px]">
        <thead className="bg-[var(--color-cj-chip)] text-[11px] uppercase tracking-wide text-[var(--color-cj-muted)]">
          <tr>
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                aria-label="Seleccionar los productos de esta página"
                checked={allSelected}
                onChange={(e) => onTogglePage(pageIds, e.target.checked)}
              />
            </th>
            <th className="w-16 px-3 py-3 font-semibold">Foto</th>
            <th className="px-3 py-3 font-semibold">Producto</th>
            <th className="px-3 py-3 font-semibold">Precio</th>
            <th className="px-3 py-3 font-semibold">Variaciones</th>
            <th className="px-3 py-3 font-semibold">Precio con envío</th>
            <th className="px-3 py-3 font-semibold">Precio final estimado</th>
            <th className="px-3 py-3 font-semibold">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const unit = unitPriceUsd(product);
            const gallery = galleries[product.id];
            const quote = quotes[product.id];
            const shipping = quote?.status === "ready" ? quote.shippingUsd : null;
            const landed = shipping == null ? null : priceWithShipping(unit, shipping);
            const finalPrice = finalPriceUsd(landed, benefitPercent);
            const photo = gallery?.images[0] ?? listImages(product)[0];
            return (
              <tr key={product.id} className="border-t border-[var(--color-cj-border)]">
                <td className="px-3 py-3 align-middle">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar ${product.nameEn ?? product.sku ?? product.id}`}
                    checked={selected.has(product.id)}
                    onChange={() => onToggle(product.id)}
                  />
                </td>
                <td className="px-3 py-3">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="h-14 w-14 rounded-lg bg-[var(--color-cj-bg)] object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-[var(--color-cj-faint)]">Sin foto</span>
                  )}
                </td>
                <td className="max-w-[320px] px-3 py-3">
                  <BilingualName
                    className="font-medium text-[var(--color-cj-text)]"
                    english={product.nameEn ?? product.sku ?? "Producto sin nombre"}
                    spanish={product.nameEn ? spanish[product.nameEn] : null}
                    pending={translating && Boolean(product.nameEn)}
                  />
                  {product.sku && (
                    <p className="mt-1 truncate font-mono text-[10px] text-[var(--color-cj-faint)]">
                      {product.sku}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[var(--color-cj-price)]">
                  {formatUsd(unit)}
                </td>
                <td className="px-3 py-3 tabular-nums text-[var(--color-cj-muted)]">
                  {variantCountLabel(galleryStatus[product.id], gallery?.variantCount)}
                </td>
                <td className="px-3 py-3">
                  <ShippingCell quote={quote} landed={landed} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-[var(--color-cj-text)]">
                  {formatUsd(finalPrice)}
                  <CopAmount usd={finalPrice} />
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/product/${product.id}`}
                    className="inline-flex rounded-lg border border-[var(--color-cj-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-cj-text)] hover:bg-[var(--color-cj-chip)]"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function variantCountLabel(status: GalleryStatus | undefined, count?: number): string {
  if (status === "pending" || status === "loading" || status == null) return "…";
  if (status === "error" || count == null) return "—";
  return String(count);
}

function ShippingCell({
  quote,
  landed,
}: {
  quote?: BogotaQuote;
  landed: number | null;
}) {
  if (!quote || quote.status === "loading") {
    return <span className="text-xs text-[var(--color-cj-faint)]">Cotizando Bogotá…</span>;
  }
  if (quote.status !== "ready" || landed == null) {
    return (
      <span className="text-xs text-[var(--color-cj-coral)]">
        {quote.message ?? "Sin envío"}
      </span>
    );
  }
  return (
    <div>
      <p className="whitespace-nowrap tabular-nums">{formatUsd(landed)}</p>
      <p className="mt-1 text-[10px] text-[var(--color-cj-faint)]">
        {quote.carrier ? `${quote.carrier} · ` : ""}
        envío {formatUsd(quote.shippingUsd)}
      </p>
    </div>
  );
}
