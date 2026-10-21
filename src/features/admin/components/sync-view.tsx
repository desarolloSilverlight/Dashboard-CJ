"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  finalPriceUsd,
  formatUsd,
  priceWithShipping,
} from "@/features/catalog/lib/quote-preview";
import {
  useAdminSync,
  type SyncDraft,
} from "@/providers/admin-sync-provider";
import { CopAmount, TrmNote } from "@/features/fx/cop-amount";
import { CatalogImportPanel } from "./catalog-import-panel";

function readNumber(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function landed(item: SyncDraft, benefitPercent: number) {
  const withShipping =
    item.shippingUsd == null ? null : priceWithShipping(item.unitUsd, item.shippingUsd);
  return finalPriceUsd(withShipping, benefitPercent);
}

export function SyncView() {
  const admin = useAdminSync();
  const [notice, setNotice] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const queueKey = admin.queue.map((item) => item.id).join("\n");

  useEffect(() => {
    setPicked(new Set(queueKey.split("\n").filter(Boolean)));
  }, [queueKey]);

  function priceOf(item: SyncDraft) {
    return landed(item, admin.benefitPercent);
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const idsToSend = admin.queue.filter((item) => picked.has(item.id)).map((item) => item.id);

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-[var(--color-cj-text)]">Sincronización</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-cj-muted)]">
          Vista previa del panel administrativo. El beneficio y la cola viven en este navegador.
          Shopify todavía no está conectado.
        </p>
      </div>

      <CatalogImportPanel />

      <section className="mb-4 rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-cj-text)]">Parámetros de ganancia</h2>
        <p className="mt-1 text-xs text-[var(--color-cj-muted)]">
          El mismo beneficio se aplica en el catálogo y en esta cola.
        </p>
        <label className="mt-3 block max-w-xs text-[11px] text-[var(--color-cj-faint)]">
          Beneficio sobre el precio con envío (%)
          <Input
            className="mt-1"
            type="number"
            min={0}
            step="1"
            value={admin.benefitPercent}
            onChange={(e) => admin.setBenefitPercent(readNumber(e.target.value))}
          />
        </label>
        <p className="mt-3 text-xs text-[var(--color-cj-muted)]">
          Precio final = (precio + envío a Bogotá) × (1 + beneficio). Con {admin.benefitPercent}% un
          producto de $10 con envío queda en {formatUsd(10 * (1 + admin.benefitPercent / 100))}.
        </p>
        <TrmNote />
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          disabled={idsToSend.length === 0}
          onClick={() => {
            const count = admin.sendToShopify(idsToSend, priceOf);
            setPicked(new Set());
            setNotice(
              count
                ? `${count} producto${count === 1 ? "" : "s"} marcado${count === 1 ? "" : "s"} como enviado${count === 1 ? "" : "s"}. La tienda aún no recibe nada.`
                : null,
            );
            document.getElementById("shopify-mock")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          Enviar a Shopify
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            document.getElementById("shopify-mock")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Ver productos de Shopify
        </Button>
        <Button
          variant="secondary"
          disabled={admin.shopify.length === 0}
          onClick={() => {
            const count = admin.updateShopifyPrices(priceOf);
            setNotice(
              count
                ? `Precios de ${count} producto${count === 1 ? "" : "s"} recalculados con ${admin.benefitPercent}% de beneficio. Shopify no se actualizó.`
                : null,
            );
          }}
        >
          Actualizar precios
        </Button>
      </div>

      {notice && (
        <p className="mb-4 rounded-lg bg-[var(--color-cj-lime)] px-3 py-2 text-sm font-medium text-[#171A20]">
          {notice}
        </p>
      )}

      <section className="mb-6">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-cj-text)]">
            Listos para enviar ({admin.queue.length})
          </h2>
          <Link href="/" className="text-xs font-semibold text-[var(--color-cj-navy)] hover:underline">
            Elegir más en el catálogo
          </Link>
        </div>
        {admin.queue.length === 0 ? (
          <Empty>
            Marca productos en el catálogo y pulsa Agregar a Shopify. Aparecen aquí antes de publicarlos.
          </Empty>
        ) : (
          <DraftTable
            items={admin.queue}
            benefitPercent={admin.benefitPercent}
            picked={picked}
            onToggle={toggle}
            onRemove={admin.removeFromQueue}
          />
        )}
      </section>

      <section id="shopify-mock">
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-cj-text)]">
          Productos de Shopify ({admin.shopify.length})
        </h2>
        <p className="mb-3 text-xs text-[var(--color-cj-muted)]">
          Lista local de lo que ya “enviaste”. El precio publicado se queda fijo hasta que pulses
          Actualizar precios.
        </p>
        {admin.shopify.length === 0 ? (
          <Empty>Todavía no hay productos en la vista previa de la tienda.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-[var(--color-cj-chip)] text-[11px] uppercase tracking-wide text-[var(--color-cj-muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Producto</th>
                  <th className="px-3 py-3 font-semibold">Precio publicado</th>
                  <th className="px-3 py-3 font-semibold">Con el beneficio actual</th>
                  <th className="px-3 py-3 font-semibold">Beneficio al enviar</th>
                </tr>
              </thead>
              <tbody>
                {admin.shopify.map((item) => {
                  const current = landed(item, admin.benefitPercent);
                  const changed =
                    current != null &&
                    item.publishedPriceUsd != null &&
                    Math.abs(current - item.publishedPriceUsd) > 0.009;
                  return (
                    <tr key={item.id} className="border-t border-[var(--color-cj-border)]">
                      <td className="px-3 py-3">
                        <ProductCell item={item} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">
                        {formatUsd(item.publishedPriceUsd)}
                        <CopAmount usd={item.publishedPriceUsd} />
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-3 tabular-nums ${
                          changed ? "font-semibold text-[var(--color-cj-coral)]" : ""
                        }`}
                      >
                        {formatUsd(current)}
                        <CopAmount usd={current} />
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[var(--color-cj-muted)]">
                        {item.publishedBenefit}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DraftTable({
  items,
  benefitPercent,
  picked,
  onToggle,
  onRemove,
}: {
  items: SyncDraft[];
  benefitPercent: number;
  picked: Set<string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-[var(--color-cj-chip)] text-[11px] uppercase tracking-wide text-[var(--color-cj-muted)]">
          <tr>
            <th className="w-10 px-3 py-3">
              <span className="sr-only">Elegir para enviar</span>
            </th>
            <th className="px-3 py-3 font-semibold">Producto</th>
            <th className="px-3 py-3 font-semibold">Precio</th>
            <th className="px-3 py-3 font-semibold">Envío</th>
            <th className="px-3 py-3 font-semibold">Precio final</th>
            <th className="px-3 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-[var(--color-cj-border)]">
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  aria-label={`Incluir ${item.name}`}
                  checked={picked.has(item.id)}
                  onChange={() => onToggle(item.id)}
                />
              </td>
              <td className="px-3 py-3">
                <ProductCell item={item} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[var(--color-cj-price)]">
                {formatUsd(item.unitUsd)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatUsd(item.shippingUsd)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">
                {formatUsd(landed(item, benefitPercent))}
                <CopAmount usd={landed(item, benefitPercent)} />
              </td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--color-cj-coral)]"
                  onClick={() => onRemove(item.id)}
                >
                  Quitar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductCell({ item }: { item: SyncDraft }) {
  return (
    <div className="flex items-center gap-3">
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image} alt="" className="h-12 w-12 rounded-lg bg-[var(--color-cj-bg)] object-contain" />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-cj-bg)] text-[10px] text-[var(--color-cj-faint)]">
          Sin foto
        </span>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 font-medium text-[var(--color-cj-text)]">{item.name}</p>
        <p className="mt-1 truncate font-mono text-[10px] text-[var(--color-cj-faint)]">
          {item.sku ?? item.id}
          {item.variantCount != null ? ` · ${item.variantCount} variaciones` : ""}
        </p>
      </div>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-cj-border)] p-8 text-center text-sm text-[var(--color-cj-muted)]">
      {children}
    </div>
  );
}
