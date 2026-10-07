"use client";

import { useEffect, useMemo, useState } from "react";
import type { CjProductDetail } from "@/core/products/types";
import { buildStockSnapshot } from "@/core/products/stock-merge";
import { createProductRepository } from "@/infrastructure/products/create-product-repository";

const repo = createProductRepository();

type Props = {
  product: CjProductDetail;
};

export function ProductInventorySection({ product }: Props) {
  const [apiData, setApiData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await repo.getStockByPid(product.pid);
        if (cancelled) return;
        if (res.code === 200) setApiData(res.data ?? null);
        else setError(res.message ?? "Stock no disponible");
      } catch {
        if (!cancelled) setError("Error al consultar inventario");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product.pid]);

  const snapshot = useMemo(
    () => buildStockSnapshot(product, apiData),
    [product, apiData],
  );

  const countryCodes = useMemo(() => {
    const set = new Set<string>();
    for (const row of snapshot.variantRows) {
      for (const c of Object.keys(row.byCountry)) set.add(c);
    }
    return [...set].sort();
  }, [snapshot.variantRows]);

  return (
    <section className="mt-10 rounded-2xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Inventario</h2>
        <span className="text-[11px] text-slate-500">
          product/query + stock/queryByPid · {snapshot.source}
        </span>
      </div>

      {snapshot.productTotal != null && (
        <p className="mt-2 text-sm text-slate-300">
          Total producto (estimado):{" "}
          <span className="font-semibold text-white">
            {snapshot.productTotal.toLocaleString("es")}
          </span>{" "}
          uds.
        </p>
      )}

      {loading && (
        <p className="mt-3 text-sm text-slate-500">Actualizando inventario API…</p>
      )}
      {error && !loading && (
        <p className="mt-2 text-xs text-amber-400">{error}</p>
      )}

      {snapshot.variantRows.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-cj-border)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-black/30 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Variante</th>
                <th className="p-3">SKU</th>
                {countryCodes.map((c) => (
                  <th key={c} className="p-3 text-right">
                    {c}
                  </th>
                ))}
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.variantRows.map((row) => (
                <tr
                  key={row.vid ?? row.variantSku ?? row.variantKey}
                  className="border-t border-[var(--color-cj-border)]"
                >
                  <td className="max-w-[140px] truncate p-3">
                    {row.variantKey ?? "—"}
                  </td>
                  <td className="p-3 font-mono text-xs">{row.variantSku ?? "—"}</td>
                  {countryCodes.map((c) => (
                    <td key={c} className="p-3 text-right tabular-nums text-slate-300">
                      {row.byCountry[c] != null
                        ? row.byCountry[c].toLocaleString("es")
                        : "—"}
                    </td>
                  ))}
                  <td className="p-3 text-right font-medium tabular-nums text-emerald-400">
                    {row.total.toLocaleString("es")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <p className="mt-4 text-sm text-slate-500">
            CJ no devolvió cantidades para este producto (puede estar agotado o sin
            reporte de stock).
          </p>
        )
      )}
    </section>
  );
}
