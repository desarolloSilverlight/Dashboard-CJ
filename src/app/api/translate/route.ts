import { NextRequest, NextResponse } from "next/server";
import { translateNames } from "@/server/translate/deepl";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { texts?: unknown };
  const texts = Array.isArray(body.texts)
    ? body.texts.filter((text): text is string => typeof text === "string")
    : [];
  try {
    return NextResponse.json(await translateNames(texts));
  } catch (err) {
    return NextResponse.json(
      {
        configured: true,
        translations: {},
        message: err instanceof Error ? err.message : "No se pudo traducir",
      },
      { status: 502 },
    );
  }
}
