import "server-only";
import { CJ_API_BASE } from "./config";
import { buildSearchParams } from "./build-query";
import type { CjApiResponse } from "@/core/products/types";
import { enqueueCj, enterInteractive, isCjRateLimitMessage } from "./rate-limiter";
import { cjCacheKey, readCjCache, writeCjCache } from "./response-cache";
import {
  CjQuotaError,
  holdBudget,
  interactiveQuotaMessage,
  isCjPointRefusal,
  pointCost,
  tryCharge,
  type PointLane,
} from "./points-budget";

export type CjRequestInit = {
  method?: string;
  token: string;
  query?: Record<string, unknown>;
  body?: unknown;
  /** interactive = buscador, ficha y flete. import = carga del listado. */
  lane?: PointLane;
};

const MAX_RETRIES = 3;

export class CjHttpClient {
  async request<T = unknown>(
    path: string,
    init: CjRequestInit,
  ): Promise<{ status: number; body: CjApiResponse<T> | Record<string, unknown> }> {
    const lane = init.lane ?? "interactive";
    const release = lane === "interactive" ? enterInteractive() : null;
    try {
      const key = cjCacheKey(path, init);
      if (key) {
        const hit = readCjCache(key);
        if (hit) {
          return { status: hit.status, body: hit.body as CjApiResponse<T> };
        }
      }
      const cost = pointCost(path);
      if (cost > 0 && !tryCharge(lane, cost)) {
        throw new CjQuotaError(
          lane === "import"
            ? "Sin puntos de carga. La reserva del buscador sigue disponible."
            : interactiveQuotaMessage(),
        );
      }
      const result = await enqueueCj(() => this.executeWithRetry<T>(path, init));
      if (key) writeCjCache(key, result.status, result.body);
      return result;
    } finally {
      release?.();
    }
  }

  private async executeWithRetry<T>(
    path: string,
    init: CjRequestInit,
    attempt = 0,
  ): Promise<{ status: number; body: CjApiResponse<T> | Record<string, unknown> }> {
    const result = await this.executeOnce<T>(path, init);
    const body = result.body as CjApiResponse<T>;
    if (isCjPointRefusal(body?.message)) {
      holdBudget();
      return result;
    }

    const rateLimited =
      result.status === 429 ||
      isCjRateLimitMessage(body?.message) ||
      body?.code === 429;

    if (rateLimited && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      return this.executeWithRetry(path, init, attempt + 1);
    }
    return result;
  }

  private async executeOnce<T>(path: string, init: CjRequestInit) {
    const url = new URL(`${CJ_API_BASE}${path}`);
    const sp = buildSearchParams(init.query);
    sp.forEach((v, k) => url.searchParams.append(k, v));

    const headers: Record<string, string> = {
      "CJ-Access-Token": init.token,
      Accept: "application/json",
    };

    const fetchInit: RequestInit = {
      method: init.method ?? "GET",
      headers,
    };

    if (init.body != null && init.method !== "GET") {
      headers["Content-Type"] = "application/json";
      fetchInit.body = JSON.stringify(init.body);
    }

    const response = await fetch(url.toString(), fetchInit);
    const text = await response.text();
    let body: CjApiResponse<T> | Record<string, unknown>;
    try {
      body = JSON.parse(text) as CjApiResponse<T>;
    } catch {
      body = { raw: text, status: response.status };
    }
    return { status: response.status, body };
  }
}

export const cjHttpClient = new CjHttpClient();
