import type { CjApiResponse } from "@/core/products/types";

const API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const INTERVAL_MS = 1100;

const publicKey = process.env.NEXT_PUBLIC_CJ_API_KEY?.trim() ?? "";

export function usesPublicCjKey() {
  return publicKey.length > 0;
}

type TokenInfo = {
  accessToken: string;
  accessTokenExpiryDate: string;
  openId: number | null;
};

let cached: TokenInfo | null = null;
let tail: Promise<unknown> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

let lastStartAt = 0;

async function waitTurn() {
  const wait = Math.max(0, lastStartAt + INTERVAL_MS - Date.now());
  if (wait > 0) await sleep(wait);
  lastStartAt = Date.now();
}

function buildQuery(params: Record<string, unknown> | undefined) {
  const sp = new URLSearchParams();
  if (!params) return "";
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) sp.append(key, String(item));
    } else {
      sp.set(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function getPublicAccessToken(force = false): Promise<TokenInfo> {
  if (!publicKey) throw new Error("Falta NEXT_PUBLIC_CJ_API_KEY");
  if (!force && cached) {
    const exp = Date.parse(cached.accessTokenExpiryDate);
    if (!Number.isNaN(exp) && exp - Date.now() > 5 * 60 * 1000) return cached;
  }

  return enqueue(async () => {
    await waitTurn();
    const res = await fetch(`${API_BASE}/authentication/getAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ apiKey: publicKey }),
    });
    const json = (await res.json()) as CjApiResponse<TokenInfo>;
    if (json.code !== 200 || !json.data?.accessToken) {
      throw new Error(json.message ?? "No se pudo obtener access token");
    }
    cached = {
      accessToken: json.data.accessToken,
      accessTokenExpiryDate: json.data.accessTokenExpiryDate,
      openId: json.data.openId ?? null,
    };
    return cached;
  });
}

async function cjFetch<T>(
  path: string,
  init: { method?: string; query?: Record<string, unknown>; body?: unknown },
): Promise<CjApiResponse<T>> {
  const token = await getPublicAccessToken();
  return enqueue(async () => {
    await waitTurn();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "CJ-Access-Token": token.accessToken,
    };
    const request: RequestInit = { method: init.method ?? "GET", headers };
    if (init.body != null && request.method !== "GET") {
      headers["Content-Type"] = "application/json";
      request.body = JSON.stringify(init.body);
    }
    const res = await fetch(`${API_BASE}${path}${buildQuery(init.query)}`, request);
    return res.json() as Promise<CjApiResponse<T>>;
  });
}

export function cjPublicGet<T>(path: string, query?: Record<string, unknown>) {
  return cjFetch<T>(path, { query });
}

export function cjPublicPost<T>(path: string, body: unknown) {
  return cjFetch<T>(path, { method: "POST", body });
}
