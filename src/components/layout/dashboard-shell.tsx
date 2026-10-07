"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStatus } from "@/providers/auth-status-provider";

const nav = [
  { href: "/", label: "Catálogo" },
  { href: "/explorer", label: "Explorador API" },
];

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("es");
  } catch {
    return iso;
  }
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    configured,
    email,
    hasToken,
    accessTokenExpiryDate,
    loading,
    refreshToken,
    error,
  } = useAuthStatus();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-cj-border)] bg-[var(--color-cj-panel)]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3">
          <div>
            <Link href="/" className="text-lg font-semibold text-white">
              CJ Dashboard
            </Link>
            <p className="text-[11px] text-slate-500">Next.js · Auth server-side</p>
          </div>
          <nav className="flex gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  pathname === item.href
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 text-xs">
            {!configured ? (
              <span className="text-amber-400">
                Configura CJ_API_KEY en .env.local
              </span>
            ) : (
              <>
                {email && (
                  <span className="hidden text-slate-500 sm:inline">{email}</span>
                )}
                <span
                  className={cn(hasToken ? "text-emerald-400" : "text-amber-400")}
                >
                  {hasToken ? "Token activo" : "Sin token"}
                  {accessTokenExpiryDate && (
                    <> · vence {formatExpiry(accessTokenExpiryDate)}</>
                  )}
                </span>
                <Button
                  variant="secondary"
                  disabled={loading}
                  onClick={() => refreshToken()}
                >
                  {loading ? "…" : "Actualizar token"}
                </Button>
              </>
            )}
            {error && <span className="text-red-400">{error}</span>}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
