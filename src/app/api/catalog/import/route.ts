import { NextRequest, NextResponse } from "next/server";
import { budgetSnapshot } from "@/server/cj/points-budget";
import {
  ensureImportAlive,
  importJobView,
  pauseCatalogImport,
  startCatalogImport,
} from "@/server/catalog/import-job";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureImportAlive();
  return NextResponse.json({
    budget: budgetSnapshot(),
    job: importJobView(),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const job = body.action === "pause" ? pauseCatalogImport() : startCatalogImport();
  return NextResponse.json({
    budget: budgetSnapshot(),
    job,
  });
}
