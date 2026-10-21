import type { Metadata } from "next";
import { JetBrains_Mono, Montserrat } from "next/font/google";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuthStatusProvider } from "@/providers/auth-status-provider";
import { AdminSyncProvider } from "@/providers/admin-sync-provider";
import { CatalogCacheProvider } from "@/providers/catalog-cache-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { TrmProvider } from "@/providers/trm-provider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-gazu",
  weight: ["500", "600", "700", "800"],
});
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Gazu · Panel operativo",
  description: "Catálogo CJ para GazuBox. Panel operativo del ecosistema Gazu.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-theme="light" className={`${montserrat.variable} ${jetbrains.variable}`}>
      <body>
        <ThemeProvider>
          <AuthStatusProvider>
            <CatalogCacheProvider>
              <TrmProvider>
                <AdminSyncProvider>
                  <DashboardShell>{children}</DashboardShell>
                </AdminSyncProvider>
              </TrmProvider>
            </CatalogCacheProvider>
          </AuthStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
