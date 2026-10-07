import { NextRequest, NextResponse } from "next/server";
import type { FreightQuoteRequest } from "@/core/logistics/types";
import { resolveCjToken } from "@/server/cj/resolve-token";
import { quoteColombiaFreight } from "@/server/logistics/quote-colombia";

export async function POST(request: NextRequest) {
  let token: string;
  try {
    token = await resolveCjToken(request);
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Auth error" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as Partial<FreightQuoteRequest>;
  const quantity = Math.max(1, Number(body.quantity) || 1);
  const unitPriceUsd = Number(body.unitPriceUsd) || 0;

  if (!body.vid || !body.variantSku) {
    return NextResponse.json(
      { ok: false, message: "vid y variantSku requeridos" },
      { status: 400 },
    );
  }

  const req: FreightQuoteRequest = {
    vid: body.vid,
    variantSku: body.variantSku,
    quantity,
    unitPriceUsd,
    startCountryCode: (body.startCountryCode || "CN").toUpperCase(),
    weightG: Number(body.weightG) || 100,
    wrapWeightG: Number(body.wrapWeightG) || Number(body.weightG) || 100,
    volumeCm3: Number(body.volumeCm3) || 1000,
    productProps: Array.isArray(body.productProps) ? body.productProps : [],
    city: body.city?.trim(),
    province: body.province?.trim(),
    zip: body.zip?.trim(),
  };

  try {
    const result = await quoteColombiaFreight(token, req);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Error al cotizar",
      },
      { status: 502 },
    );
  }
}
