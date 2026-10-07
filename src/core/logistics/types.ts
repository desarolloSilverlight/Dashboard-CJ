export type FreightQuoteRequest = {
  vid: string;
  variantSku: string;
  quantity: number;
  unitPriceUsd: number;
  startCountryCode: string;
  weightG: number;
  wrapWeightG: number;
  volumeCm3: number;
  productProps: string[];
  city?: string;
  province?: string;
  zip?: string;
};

export type FreightLineItem = {
  label: string;
  amountUsd: number | null;
  note?: string;
};

export type FreightShippingOption = {
  carrierName: string;
  arrivalTime?: string;
  source: "calculate" | "tip" | "merged";
  lines: FreightLineItem[];
  productSubtotalUsd: number;
  shippingTotalUsd: number;
  estimatedTotalUsd: number;
  channelId?: string;
  message?: string;
};

export type FreightQuoteResponse = {
  ok: boolean;
  destination: string;
  origin: string;
  quantity: number;
  unitPriceUsd: number;
  options: FreightShippingOption[];
  cheapest?: FreightShippingOption;
  message?: string;
};
