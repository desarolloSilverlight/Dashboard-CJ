import type {
  FreightLineItem,
  FreightQuoteRequest,
  FreightShippingOption,
} from "./types";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sumParts(parts: (number | null)[]): number {
  return parts.reduce((acc: number, x) => acc + (x ?? 0), 0);
}

type CalculateRow = {
  logisticName?: string;
  logisticAging?: string;
  logisticPrice?: number;
  taxesFee?: number;
  clearanceOperationFee?: number;
  totalPostageFee?: number;
};

type TipRow = {
  option?: { enName?: string; cnName?: string; arrivalTime?: string };
  channel?: { enName?: string };
  arrivalTime?: string;
  postage?: number;
  wrapPostage?: number;
  discountFee?: number;
  remoteFee?: number;
  taxesFee?: number;
  clearanceOperationFee?: number;
  tariff?: number;
  totalPostageFee?: number;
  message?: string;
  channelId?: string;
};

export function normalizeFreightQuote(
  req: FreightQuoteRequest,
  calculateRows: CalculateRow[],
  tipRows: TipRow[],
): FreightShippingOption[] {
  const productSubtotal = req.unitPriceUsd * req.quantity;
  const options: FreightShippingOption[] = [];

  for (const row of tipRows) {
    const name =
      row.option?.enName ??
      row.channel?.enName ??
      row.option?.cnName ??
      "Método logístico";
    const postage = num(row.postage) ?? num(row.wrapPostage) ?? num(row.discountFee);
    const remote = num(row.remoteFee);
    const taxes = num(row.taxesFee);
    const clearance = num(row.clearanceOperationFee);
    const tariff = num(row.tariff);
    const shippingTotal =
      num(row.totalPostageFee) ??
      sumParts([postage, remote, taxes, clearance, tariff]);

    const lines: FreightLineItem[] = [
      { label: "Precio producto (unitario)", amountUsd: req.unitPriceUsd },
      { label: `Subtotal producto (×${req.quantity})`, amountUsd: productSubtotal },
      { label: "Envío base (postage)", amountUsd: postage },
      { label: "Recargo zona remota", amountUsd: remote },
      { label: "Impuestos (taxesFee)", amountUsd: taxes },
      { label: "Despacho aduanero", amountUsd: clearance },
      { label: "Arancel (tariff)", amountUsd: tariff },
      {
        label: "Total envío CJ",
        amountUsd: shippingTotal,
        note: "totalPostageFee o suma de componentes",
      },
      {
        label: "Total estimado (producto + envío)",
        amountUsd: productSubtotal + shippingTotal,
      },
    ];

    options.push({
      carrierName: name,
      arrivalTime: row.arrivalTime ?? row.option?.arrivalTime,
      source: "tip",
      lines,
      productSubtotalUsd: productSubtotal,
      shippingTotalUsd: shippingTotal,
      estimatedTotalUsd: productSubtotal + shippingTotal,
      channelId: row.channelId,
      message: row.message,
    });
  }

  for (const row of calculateRows) {
    const name = row.logisticName ?? "Método logístico";
    if (options.some((o) => o.carrierName === name)) continue;

    const logistic = num(row.logisticPrice);
    const taxes = num(row.taxesFee);
    const clearance = num(row.clearanceOperationFee);
    const shippingTotal =
      num(row.totalPostageFee) ?? sumParts([logistic, taxes, clearance]);

    const lines: FreightLineItem[] = [
      { label: "Precio producto (unitario)", amountUsd: req.unitPriceUsd },
      { label: `Subtotal producto (×${req.quantity})`, amountUsd: productSubtotal },
      { label: "Envío (logisticPrice)", amountUsd: logistic },
      { label: "Impuestos (taxesFee)", amountUsd: taxes },
      { label: "Despacho aduanero", amountUsd: clearance },
      { label: "Total envío CJ", amountUsd: shippingTotal },
      {
        label: "Total estimado (producto + envío)",
        amountUsd: productSubtotal + shippingTotal,
      },
    ];

    options.push({
      carrierName: name,
      arrivalTime: row.logisticAging,
      source: "calculate",
      lines,
      productSubtotalUsd: productSubtotal,
      shippingTotalUsd: shippingTotal,
      estimatedTotalUsd: productSubtotal + shippingTotal,
    });
  }

  return options.sort(
    (a, b) => a.estimatedTotalUsd - b.estimatedTotalUsd,
  );
}
