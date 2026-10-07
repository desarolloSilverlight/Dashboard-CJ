"use client";

import { useEffect, useMemo, useState } from "react";
import type { CjProductDetail, CjVariant } from "@/core/products/types";
import type {
  FreightQuoteResponse,
  FreightShippingOption,
} from "@/core/logistics/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  originCountryOptions,
  productLogisticsProps,
  unitPriceUsd,
  variantVolumeCm3,
  variantWeightGrams,
} from "../lib/variant-metrics";

type Props = {
  product: CjProductDetail;
  variant?: CjVariant;
};

export function ColombiaFreightQuote({ product, variant }: Props) {
  const origins = useMemo(() => originCountryOptions(variant), [variant]);
  const [origin, setOrigin] = useState(origins[0] ?? "CN");

  useEffect(() => {
    if (origins.length && !origins.includes(origin)) {
      setOrigin(origins[0]);
    }
  }, [origins, origin]);
  const [quantity, setQuantity] = useState(1);
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<FreightQuoteResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!variant?.vid || !variant.variantSku) {
    return (
      <section className="rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-5">
        <h2 className="text-lg font-semibold">Cotización a Colombia</h2>
        <p className="mt-2 text-sm text-slate-500">
          Selecciona una variante para calcular envío.
        </p>
      </section>
    );
  }

  async function calculate() {
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const res = await fetch("/api/logistic/quote-colombia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vid: variant!.vid,
          variantSku: variant!.variantSku,
          quantity,
          unitPriceUsd: unitPriceUsd(variant, product),
          startCountryCode: origin,
          weightG: variantWeightGrams(variant, product),
          wrapWeightG: variantWeightGrams(variant, product),
          volumeCm3: variantVolumeCm3(variant),
          productProps: productLogisticsProps(product),
          city,
          province,
          zip,
        }),
      });
      const data = (await res.json()) as FreightQuoteResponse & {
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "No se pudo cotizar");
      }
      setQuote(data);
      setExpanded(data.cheapest?.carrierName ?? data.options[0]?.carrierName ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const price = unitPriceUsd(variant, product);

  return (
    <section className="mt-14 border-t border-[var(--color-cj-border)] pt-10">
      <h2 className="text-xl font-semibold">Cotización estimada a Colombia</h2>
      <p className="mt-1 text-sm text-slate-500">
        Usa las APIs{" "}
        <code className="text-xs text-slate-400">freightCalculate</code> +{" "}
        <code className="text-xs text-slate-400">freightCalculateTip</code>.
        Estimado CJ en USD; impuestos locales en destino pueden aplicar aparte.
      </p>

      <div className="mt-4 grid gap-3 rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Origen (stock)">
          <select
            className="select-field"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          >
            {origins.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cantidad">
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
          />
        </Field>
        <Field label="Ciudad (opcional)">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Departamento (opcional)">
          <Input value={province} onChange={(e) => setProvince(e.target.value)} />
        </Field>
        <Field label="Código postal (opcional)">
          <Input value={zip} onChange={(e) => setZip(e.target.value)} />
        </Field>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button className="w-full" disabled={loading} onClick={calculate}>
            {loading ? "Calculando…" : "Calcular total estimado"}
          </Button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-600">
        Variante: {variant.variantSku} · Peso ~{variantWeightGrams(variant, product)} g
        · Precio unit. ${price.toFixed(2)}
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {quote?.cheapest && (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-xs uppercase tracking-wide text-emerald-400/90">
            Mejor estimado
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">
            ${quote.cheapest.estimatedTotalUsd.toFixed(2)} USD
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {quote.cheapest.carrierName}
            {quote.cheapest.arrivalTime && ` · ${quote.cheapest.arrivalTime} días`}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Producto ${quote.cheapest.productSubtotalUsd.toFixed(2)} + envío $
            {quote.cheapest.shippingTotalUsd.toFixed(2)}
          </p>
        </div>
      )}

      {quote && quote.options.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">
            Métodos de envío ({quote.options.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-cj-border)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[var(--color-cj-panel)] text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Transportista</th>
                  <th className="p-3">Tiempo</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Envío total</th>
                  <th className="p-3">Total estimado</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {quote.options.map((opt) => (
                  <tr
                    key={`${opt.carrierName}-${opt.channelId ?? opt.source}`}
                    className="border-t border-[var(--color-cj-border)]"
                  >
                    <td className="p-3 font-medium">{opt.carrierName}</td>
                    <td className="p-3 text-slate-400">{opt.arrivalTime ?? "—"}</td>
                    <td className="p-3 tabular-nums">
                      ${opt.productSubtotalUsd.toFixed(2)}
                    </td>
                    <td className="p-3 tabular-nums">
                      ${opt.shippingTotalUsd.toFixed(2)}
                    </td>
                    <td className="p-3 tabular-nums font-semibold text-emerald-400">
                      ${opt.estimatedTotalUsd.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        className="text-xs text-blue-400 hover:underline"
                        onClick={() =>
                          setExpanded(
                            expanded === opt.carrierName ? null : opt.carrierName,
                          )
                        }
                      >
                        {expanded === opt.carrierName ? "Ocultar" : "Desglose"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {quote.options.map(
            (opt) =>
              expanded === opt.carrierName && (
                <BreakdownTable key={opt.carrierName} option={opt} />
              ),
          )}
        </div>
      )}
    </section>
  );
}

function BreakdownTable({ option }: { option: FreightShippingOption }) {
  return (
    <div className="rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4">
      <h4 className="mb-3 font-medium">
        Desglose — {option.carrierName}
        <span className="ml-2 text-xs font-normal text-slate-500">
          ({option.source === "tip" ? "Tip + Calculate" : "Calculate"})
        </span>
      </h4>
      {option.message && (
        <p className="mb-3 text-xs text-amber-400/90">{option.message}</p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="pb-2">Concepto</th>
            <th className="pb-2 text-right">USD</th>
          </tr>
        </thead>
        <tbody>
          {option.lines.map((line) => (
            <tr
              key={line.label}
              className={`border-t border-[var(--color-cj-border)] ${
                line.label.includes("Total estimado")
                  ? "font-semibold text-emerald-400"
                  : line.label.includes("Total envío")
                    ? "font-medium text-slate-200"
                    : ""
              }`}
            >
              <td className="py-2 pr-4 text-slate-300">
                {line.label}
                {line.note && (
                  <span className="ml-1 text-[10px] text-slate-600">
                    ({line.note})
                  </span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums">
                {line.amountUsd != null ? `$${line.amountUsd.toFixed(2)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
