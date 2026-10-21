import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const file = path.join(process.cwd(), "data", "translation-trial.json");
    const parsed = JSON.parse(readFileSync(file, "utf8")) as {
      items?: Array<{
        english: string;
        category?: string;
        deepl: string | null;
        local: string | null;
      }>;
    };
    return NextResponse.json({ items: parsed.items ?? [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
