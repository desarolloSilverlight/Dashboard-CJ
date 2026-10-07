import "server-only";
import { CJ_API_BASE } from "./config";
import { buildSearchParams } from "./build-query";
import type { CjApiResponse } from "@/core/products/types";
import { enqueueCj, isCjRateLimitMessage } from "./rate-limiter";

export type CjRequestInit = {
  method?: string;
  token: string;
  query?: Record<string, unknown>;
  body?: unknown;
};

const MAX_RETRIES = 3;

export class CjHttpClient {
  async request<T = unknown>(
    path: string,
    init: CjRequestInit,
  ): Promise<{ status: number; body: CjApiResponse<T> | Record<string, unknown> }> {
    return enqueueCj(() => this.executeWithRetry<T>(path, init));
  }

  private async executeWithRetry<T>(
    path: string,
    init: CjRequestInit,
    attempt = 0,
  ): Promise<{ status: number; body: CjApiResponse<T> | Record<string, unknown> }> {
    const result = await this.executeOnce<T>(path, init);
    const body = result.body as CjApiResponse<T>;
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
