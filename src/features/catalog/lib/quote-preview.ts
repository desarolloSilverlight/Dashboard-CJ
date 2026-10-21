export function priceWithShipping(unitUsd: number | null, shippingUsd: number): number | null {
  if (unitUsd == null) return null;
  return unitUsd + Math.max(0, shippingUsd);
}

export function finalPriceUsd(
  withShipping: number | null,
  benefitPercent: number,
): number | null {
  if (withShipping == null) return null;
  const benefit = Number.isFinite(benefitPercent) ? benefitPercent : 0;
  return withShipping * (1 + Math.max(0, benefit) / 100);
}

export function usdToCop(usd: number | null, trm: number | null): number | null {
  if (usd == null || trm == null || !Number.isFinite(usd) || !Number.isFinite(trm)) return null;
  return Math.round(usd * trm);
}

export function formatCop(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `COP ${value.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

export function formatUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
