"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GazuMark } from "@/components/brand/gazu-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStatus } from "@/providers/auth-status-provider";
import { useTheme, type Theme } from "@/providers/theme-provider";

const nav = [
  { href: "/", label: "Catálogo" },
  { href: "/sincronizar", label: "Sincronizar" },
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
      <header className="border-b border-white/10 bg-[#171A20] text-[#F7F7F2]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center justify-between gap-3">
            <GazuMark />
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition",
                  pathname === item.href
                    ? "bg-[var(--color-cj-lime)] text-[#171A20]"
                    : "text-[#F7F7F2]/75 hover:text-[#F7F7F2]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex w-full flex-wrap items-center gap-2 text-xs sm:ml-auto sm:w-auto sm:justify-end">
            <ThemeSwitch theme={theme} onChange={setTheme} />
            {!configured ? (
              <span className="text-[var(--color-cj-coral)]">
                Configura CJ_API_KEY en .env.local
              </span>
            ) : (
              <>
                {email && (
                  <span className="hidden max-w-40 truncate text-[#F7F7F2]/55 lg:inline">{email}</span>
                )}
                <span className={cn(hasToken ? "text-[#F7F7F2]" : "text-[var(--color-cj-coral)]")}>
                  {hasToken ? "Token activo" : "Sin token"}
                  {accessTokenExpiryDate && (
                    <span className="hidden md:inline">
                      {" "}
                      · vence {formatExpiry(accessTokenExpiryDate)}
                    </span>
                  )}
                </span>
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  disabled={loading}
                  onClick={() => refreshToken()}
                >
                  {loading ? "…" : "Actualizar token"}
                </Button>
              </>
            )}
            {error && <span className="text-[var(--color-cj-coral)]">{error}</span>}
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
      className="flex rounded-lg border border-white/15 bg-white/5 p-0.5"
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
          ? "bg-[var(--color-cj-lime)] text-[#171A20]"
          : "text-[#F7F7F2]/70 hover:text-[#F7F7F2]",
      )}
    >
      {children}
    </button>
  );
}
