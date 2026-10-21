"use client";

import { formatCop, usdToCop } from "@/features/catalog/lib/quote-preview";
import { useTrm } from "@/providers/trm-provider";

export function CopAmount({ usd }: { usd: number | null }) {
  const trm = useTrm();
  const cop = usdToCop(usd, trm?.valor ?? null);
  if (cop == null) return null;
  return (
    <span className="block text-[11px] font-medium tabular-nums text-[var(--color-cj-muted)]">
      {formatCop(cop)}
    </span>
  );
}

export function TrmNote() {
  const trm = useTrm();
  if (!trm) return null;
  const valor = trm.valor.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const desde = trm.vigenciaDesde.slice(0, 10);
  const hasta = trm.vigenciaHasta.slice(0, 10);
  return (
    <p className="mt-3 text-xs text-[var(--color-cj-muted)]">
      {trm.current ? "TRM vigente" : "Última TRM publicada"}: {valor} pesos por dólar, del {desde} al {hasta}.
      El valor en pesos es el precio en dólares multiplicado por esa tasa.
    </p>
  );
}
