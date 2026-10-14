"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPublicAccessToken, usesPublicCjKey } from "@/infrastructure/http/cj-public";

export type AuthStatus = {
  configured: boolean;
  email: string | null;
  hasToken: boolean;
  accessTokenExpiryDate: string | null;
  openId: number | null;
};

type AuthContextValue = AuthStatus & {
  loading: boolean;
  refreshToken: () => Promise<void>;
  reloadStatus: () => Promise<void>;
  error: string | null;
};

const defaultStatus: AuthStatus = {
  configured: false,
  email: null,
  hasToken: false,
  accessTokenExpiryDate: null,
  openId: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchStatus(): Promise<AuthStatus> {
  if (usesPublicCjKey()) {
    const token = await getPublicAccessToken();
    return {
      configured: true,
      email: process.env.NEXT_PUBLIC_CJ_EMAIL?.trim() || null,
      hasToken: true,
      accessTokenExpiryDate: token.accessTokenExpiryDate,
      openId: token.openId,
    };
  }
  const res = await fetch("/api/auth/status");
  return res.json();
}

export function AuthStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(defaultStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadStatus = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setStatus(data);
      setError(null);
    } catch {
      setError("No se pudo leer el estado de auth");
    }
  }, []);

  const refreshToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (usesPublicCjKey()) {
        const token = await getPublicAccessToken(true);
        setStatus({
          configured: true,
          email: process.env.NEXT_PUBLIC_CJ_EMAIL?.trim() || null,
          hasToken: true,
          accessTokenExpiryDate: token.accessTokenExpiryDate,
          openId: token.openId,
        });
        return;
      }
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al renovar");
      setStatus({
        configured: data.configured,
        email: data.email,
        hasToken: data.hasToken,
        accessTokenExpiryDate: data.accessTokenExpiryDate,
        openId: data.openId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al renovar token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadStatus().finally(() => setLoading(false));
  }, [reloadStatus]);

  const value = useMemo(
    () => ({
      ...status,
      loading,
      refreshToken,
      reloadStatus,
      error,
    }),
    [status, loading, refreshToken, reloadStatus, error],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthStatus() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthStatus within AuthStatusProvider");
  return ctx;
}
