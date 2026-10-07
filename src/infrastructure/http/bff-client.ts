import type { CjApiResponse } from "@/core/products/types";

const TOKEN_HEADER = "CJ-Access-Token";

function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) sp.append(key, String(v));
    } else {
      sp.set(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Cliente hacia el BFF de Next.js; el token CJ vive en el servidor (.env.local). */
export class BffClient {
  constructor(private readonly getToken?: () => string) {}

  private headers(extra?: HeadersInit): HeadersInit {
    const base: Record<string, string> = { Accept: "application/json" };
    const token = this.getToken?.()?.trim();
    if (token) base[TOKEN_HEADER] = token;
    return { ...base, ...(extra as Record<string, string>) };
  }

  async get<T>(
    path: string,
    query?: Record<string, unknown>,
  ): Promise<CjApiResponse<T>> {
    const res = await fetch(`/api/cj${path}${buildQuery(query ?? {})}`, {
      headers: this.headers(),
    });
    return res.json();
  }

  async post<T>(path: string, body: unknown): Promise<CjApiResponse<T>> {
    const res = await fetch(`/api/cj${path}`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    return res.json();
  }
}
