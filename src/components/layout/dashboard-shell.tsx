"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStatus } from "@/providers/auth-status-provider";
import { useTheme, type Theme } from "@/providers/theme-provider";

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
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-cj-border)] bg-[var(--color-cj-panel)]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3">
          <div>
            <Link href="/" className="text-lg font-semibold text-[var(--color-cj-text)]">
              CJ Dashboard
            </Link>
            <p className="text-[11px] text-[var(--color-cj-faint)]">Next.js · Auth server-side</p>
          </div>
          <nav className="flex gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  pathname === item.href
                    ? "bg-blue-600/15 text-[var(--color-cj-accent)]"
                    : "text-[var(--color-cj-muted)] hover:text-[var(--color-cj-text)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 text-xs">
            <ThemeSwitch theme={theme} onChange={setTheme} />
            {!configured ? (
              <span className="text-amber-400">
                Configura CJ_API_KEY en .env.local
              </span>
            ) : (
              <>
                {email && (
                  <span className="hidden text-[var(--color-cj-faint)] sm:inline">{email}</span>
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

function ThemeSwitch({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div
      className="flex rounded-lg border border-[var(--color-cj-border)] bg-[var(--color-cj-bg)] p-0.5"
      role="group"
      aria-label="Tema"
    >
      <ThemeOption
        active={theme === "light"}
        onClick={() => onChange("light")}
      >
        Claro
      </ThemeOption>
      <ThemeOption active={theme === "dark"} onClick={() => onChange("dark")}>
        Oscuro
      </ThemeOption>
    </div>
  );
}

function ThemeOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "bg-blue-600 text-white"
          : "text-[var(--color-cj-muted)] hover:text-[var(--color-cj-text)]",
      )}
    >
      {children}
    </button>
  );
}
