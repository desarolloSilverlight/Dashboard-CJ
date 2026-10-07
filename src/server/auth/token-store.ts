import "server-only";

export type CjTokenBundle = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiryDate: string;
  refreshTokenExpiryDate?: string;
  openId?: number;
  updatedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __cjTokenBundle: CjTokenBundle | undefined;
}

export function readTokenBundle(): CjTokenBundle | null {
  return globalThis.__cjTokenBundle ?? null;
}

export function writeTokenBundle(bundle: Omit<CjTokenBundle, "updatedAt">): CjTokenBundle {
  const next: CjTokenBundle = { ...bundle, updatedAt: Date.now() };
  globalThis.__cjTokenBundle = next;
  return next;
}

export function clearTokenBundle(): void {
  globalThis.__cjTokenBundle = undefined;
}
