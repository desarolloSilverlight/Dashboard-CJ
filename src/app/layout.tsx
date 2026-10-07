import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuthStatusProvider } from "@/providers/auth-status-provider";
import { CatalogCacheProvider } from "@/providers/catalog-cache-provider";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "CJ Dropshipping Dashboard",
  description: "Catálogo y explorador API CJ — Next.js BFF",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${dmSans.variable} ${jetbrains.variable}`}>
      <body>
        <AuthStatusProvider>
          <CatalogCacheProvider>
            <DashboardShell>{children}</DashboardShell>
          </CatalogCacheProvider>
        </AuthStatusProvider>
      </body>
    </html>
  );
}
