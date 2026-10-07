import "server-only";
import type { FreightQuoteRequest, FreightQuoteResponse } from "@/core/logistics/types";
import { normalizeFreightQuote } from "@/core/logistics/normalize-freight";
import { cjHttpClient } from "@/server/cj/cj-http-client";

const DEST = "CO";

type CjEnvelope<T> = { code?: number; message?: string; data?: T };

export async function quoteColombiaFreight(
  token: string,
  req: FreightQuoteRequest,
): Promise<FreightQuoteResponse> {
  const origin = req.startCountryCode.toUpperCase();

  const calcBody = {
    startCountryCode: origin,
    endCountryCode: DEST,
    products: [{ vid: req.vid, quantity: req.quantity }],
  };

  const { body: calcRaw } = await cjHttpClient.request<CjEnvelope<unknown[]>>(
    "/logistic/freightCalculate",
    { method: "POST", token, body: calcBody },
  );

  const calcEnvelope = calcRaw as CjEnvelope<unknown[]>;
  const calculateRows =
    calcEnvelope.code === 200 && Array.isArray(calcEnvelope.data)
      ? (calcEnvelope.data as Record<string, unknown>[])
      : [];

  let tipRows: Record<string, unknown>[] = [];
  const weight = Math.max(1, Math.round(req.weightG));
  const wrapWeight = Math.max(weight, Math.round(req.wrapWeightG || weight));
  const volume = Math.max(1, req.volumeCm3);
  const props =
    req.productProps.length > 0 ? req.productProps : ["COMMON"];

  if (req.variantSku) {
    const tipBody = {
      reqDTOS: [
        {
          srcAreaCode: origin,
          destAreaCode: DEST,
          weight,
          wrapWeight,
          volume,
          productProp: props,
          skuList: [req.variantSku],
          freightTrialSkuList: [
            {
              vid: req.vid,
              sku: req.variantSku,
              skuQuantity: req.quantity,
              skuWeight: weight,
              skuVolume: volume,
            },
          ],
          totalGoodsAmount: req.unitPriceUsd * req.quantity,
          city: req.city || undefined,
          province: req.province || undefined,
          zip: req.zip || undefined,
        },
      ],
    };

    const { body: tipRaw } = await cjHttpClient.request<CjEnvelope<unknown[]>>(
      "/logistic/freightCalculateTip",
      { method: "POST", token, body: tipBody },
    );
    const tipEnvelope = tipRaw as CjEnvelope<unknown[]>;
    if (tipEnvelope.code === 200 && Array.isArray(tipEnvelope.data)) {
      tipRows = tipEnvelope.data as Record<string, unknown>[];
    }
  }

  const options = normalizeFreightQuote(req, calculateRows, tipRows);

  if (options.length === 0) {
    return {
      ok: false,
      destination: DEST,
      origin,
      quantity: req.quantity,
      unitPriceUsd: req.unitPriceUsd,
      options: [],
      message:
        calcEnvelope.message ??
        "Sin métodos de envío a Colombia para esta variante. Revisa peso, origen o propiedad logística.",
    };
  }

  return {
    ok: true,
    destination: DEST,
    origin,
    quantity: req.quantity,
    unitPriceUsd: req.unitPriceUsd,
    options,
    cheapest: options[0],
  };
}
