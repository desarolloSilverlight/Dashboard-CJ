import { NextRequest, NextResponse } from "next/server";
import { toCardGallery } from "@/features/catalog/lib/card-gallery";
import type { CjProductDetail } from "@/core/products/types";
import { cjHttpClient } from "@/server/cj/cj-http-client";
import { CJ_BATCH_DELAY_MS } from "@/server/cj/config";
import { resolveCjToken } from "@/server/cj/resolve-token";

export async function POST(request: NextRequest) {
  let token: string;
  try {
    token = await resolveCjToken(request);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Auth no configurada" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const {
    pids = [],
    countryCode,
    features = ["enable_video", "enable_combine"],
    view,
  } = body as {
    pids?: string[];
    countryCode?: string;
    features?: string[];
    view?: string;
  };

  if (!Array.isArray(pids) || pids.length === 0) {
    return NextResponse.json({ message: "pids array required" }, { status: 400 });
  }
  const max = view === "card" ? 20 : 500;
  if (pids.length > max) {
    return NextResponse.json({ message: `Max ${max} pids per batch` }, { status: 400 });
  }

  const results: unknown[] = [];
  const errors: unknown[] = [];

  for (let i = 0; i < pids.length; i++) {
    const pid = pids[i];
    const query: Record<string, unknown> = { pid, features };
    if (countryCode) query.countryCode = countryCode;

    const { body: cjBody } = await cjHttpClient.request("/product/query", {
      method: "GET",
      token,
      query,
    });

    const row = cjBody as { code?: number; data?: CjProductDetail };
    if (row.code === 200 && row.data) {
      results.push(
        view === "card" ? toCardGallery(row.data, pid) : row.data,
      );
    } else errors.push({ pid, ...cjBody });

    if (i < pids.length - 1 && CJ_BATCH_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, CJ_BATCH_DELAY_MS));
    }
  }

  return NextResponse.json({
    ok: true,
    count: results.length,
    errors: errors.length,
    data: results,
    errorDetails: errors.slice(0, 20),
  });
}
