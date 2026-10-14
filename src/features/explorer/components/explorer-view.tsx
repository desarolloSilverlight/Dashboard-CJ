"use client";

import { useState } from "react";
import { PRODUCT_ENDPOINTS } from "@/core/products/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductRepository } from "@/features/catalog/hooks/use-product-repository";
import { useAuthStatus } from "@/providers/auth-status-provider";

export function ExplorerView() {
  const { configured, hasToken } = useAuthStatus();
  const repo = useProductRepository();
  const [endpointId, setEndpointId] = useState<string>(PRODUCT_ENDPOINTS[1].id);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const ep = PRODUCT_ENDPOINTS.find((e) => e.id === endpointId)!;

  async function run() {
    if (!configured) {
      setResponse(JSON.stringify({ error: "Configura .env.local" }, null, 2));
      return;
    }
    if (!hasToken) {
      setResponse(JSON.stringify({ error: "Pulsa Actualizar token" }, null, 2));
      return;
    }
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      for (const p of ep.params) {
        const v = paramValues[p];
        if (v) query[p] = v;
      }
      const res =
        ep.method === "GET"
          ? await repo.proxyGet(ep.path, query)
          : await repo.proxyPost(ep.path, {});
      setResponse(JSON.stringify(res, null, 2));
    } catch (e) {
      setResponse(JSON.stringify({ error: String(e) }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Explorador (Product API)</h2>
        <label className="mb-2 block text-[11px] text-[var(--color-cj-faint)]">Endpoint</label>
        <select
          value={endpointId}
          onChange={(e) => {
            setEndpointId(e.target.value);
            setParamValues({});
          }}
          className="select-field mb-3"
        >
          {PRODUCT_ENDPOINTS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label} — {e.method} {e.path}
            </option>
          ))}
        </select>
        <p className="mb-3 font-mono text-xs text-[var(--color-cj-faint)]">
          BFF: /api/cj{ep.path}
        </p>
        {ep.params.map((p) => (
          <label key={p} className="mb-2 block">
            <span className="mb-1 block text-[11px] text-[var(--color-cj-faint)]">{p}</span>
            <Input
              className="font-mono text-xs"
              value={paramValues[p] ?? ""}
              onChange={(e) =>
                setParamValues((v) => ({ ...v, [p]: e.target.value }))
              }
            />
          </label>
        ))}
        <Button className="mt-2 w-full" disabled={loading} onClick={run}>
          {loading ? "Ejecutando…" : "Ejecutar"}
        </Button>
      </div>
      <div className="min-h-[480px] rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4">
        <h2 className="mb-2 text-sm text-[var(--color-cj-muted)]">Respuesta</h2>
        <pre className="h-[440px] overflow-auto rounded-lg bg-[var(--color-cj-bg)] p-3 font-mono text-xs text-[var(--color-cj-text)]">
          {response || "—"}
        </pre>
      </div>
    </div>
  );
}
