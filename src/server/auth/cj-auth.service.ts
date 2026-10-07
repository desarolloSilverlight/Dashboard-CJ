import "server-only";
import { CJ_API_BASE } from "@/server/cj/config";
import { enqueueCj, isCjRateLimitMessage } from "@/server/cj/rate-limiter";
import {
  clearTokenBundle,
  readTokenBundle,
  writeTokenBundle,
  type CjTokenBundle,
} from "./token-store";

type AuthData = {
  openId?: number;
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate?: string;
};

type AuthResponse = {
  code: number;
  message?: string;
  data?: AuthData;
};

function getApiKey(): string {
  const key = process.env.CJ_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Falta CJ_API_KEY en .env.local (My CJ → Authorization → API)",
    );
  }
  return key;
}

function parseExpiry(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function isAccessTokenValid(bundle: CjTokenBundle, skewMs = 5 * 60 * 1000): boolean {
  const exp = parseExpiry(bundle.accessTokenExpiryDate);
  return exp - Date.now() > skewMs;
}

async function postAuth<T>(path: string, body: unknown, attempt = 0): Promise<T> {
  return enqueueCj(async () => {
    const res = await fetch(`${CJ_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as T & { message?: string; code?: number };
    const rateLimited =
      res.status === 429 ||
      isCjRateLimitMessage(json.message) ||
      json.code === 429;
    if (rateLimited && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      return postAuth(path, body, attempt + 1);
    }
    return json;
  });
}

export async function fetchNewAccessToken(): Promise<CjTokenBundle> {
  const apiKey = getApiKey();
  const res = await postAuth<AuthResponse>(
    "/authentication/getAccessToken",
    { apiKey },
  );
  if (res.code !== 200 || !res.data?.accessToken) {
    throw new Error(res.message ?? "No se pudo obtener access token");
  }
  return writeTokenBundle({
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken,
    accessTokenExpiryDate: res.data.accessTokenExpiryDate,
    refreshTokenExpiryDate: res.data.refreshTokenExpiryDate,
    openId: res.data.openId,
  });
}

async function refreshAccessToken(refreshToken: string): Promise<CjTokenBundle> {
  const res = await postAuth<AuthResponse>(
    "/authentication/refreshAccessToken",
    { refreshToken },
  );
  if (res.code !== 200 || !res.data?.accessToken) {
    throw new Error(res.message ?? "Refresh token falló");
  }
  return writeTokenBundle({
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken,
    accessTokenExpiryDate: res.data.accessTokenExpiryDate,
    refreshTokenExpiryDate: res.data.refreshTokenExpiryDate,
    openId: res.data.openId,
  });
}

/** Obtiene token válido: cache → refresh → getAccessToken con API key. */
export async function getValidAccessToken(): Promise<string> {
  const cached = readTokenBundle();
  if (cached && isAccessTokenValid(cached)) {
    return cached.accessToken;
  }
  if (cached?.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(cached.refreshToken);
      return refreshed.accessToken;
    } catch {
      clearTokenBundle();
    }
  }
  const fresh = await fetchNewAccessToken();
  return fresh.accessToken;
}

/** Fuerza nuevo token (botón "Actualizar token"). */
export async function forceRenewAccessToken(): Promise<CjTokenBundle> {
  const cached = readTokenBundle();
  if (cached?.refreshToken) {
    try {
      return await refreshAccessToken(cached.refreshToken);
    } catch {
      clearTokenBundle();
    }
  }
  return fetchNewAccessToken();
}

export function getAuthStatusPublic() {
  const bundle = readTokenBundle();
  const email = process.env.CJ_EMAIL?.trim() ?? null;
  const hasApiKey = Boolean(process.env.CJ_API_KEY?.trim());
  return {
    configured: hasApiKey,
    email,
    hasToken: Boolean(bundle?.accessToken),
    accessTokenExpiryDate: bundle?.accessTokenExpiryDate ?? null,
    openId: bundle?.openId ?? null,
  };
}
